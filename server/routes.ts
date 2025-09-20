import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertVideoSchema, insertUserSchema, insertPurchaseSchema } from "@shared/schema";
import { ObjectStorageService } from "./objectStorage";
import { filecoinService } from "./filecoinService";
import { filecoinPayService } from "./filecoinPay";
import { synapseService } from "./synapseService";

export async function registerRoutes(app: Express): Promise<Server> {
  // Video routes
  app.get("/api/videos", async (req, res) => {
    try {
      const { category, search, trending, creator } = req.query;
      
      let videos;
      if (trending) {
        videos = await storage.getTrendingVideos(parseInt(trending as string) || 10);
      } else if (category) {
        videos = await storage.getVideosByCategory(category as string);
      } else if (search) {
        videos = await storage.searchVideos(search as string);
      } else if (creator) {
        videos = await storage.getVideosByCreator(creator as string);
      } else {
        videos = await storage.getAllVideos();
      }

      // Add creator info to videos
      const videosWithCreators = await Promise.all(videos.map(async (video) => {
        const creator = await storage.getUser(video.creatorId!);
        return {
          ...video,
          creator: creator ? {
            id: creator.id,
            username: creator.username,
            avatar: creator.avatar,
            isVerified: creator.isVerified
          } : null
        };
      }));

      res.json(videosWithCreators);
    } catch (error) {
      console.error("Error fetching videos:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/videos/:id", async (req, res) => {
    try {
      const video = await storage.getVideo(req.params.id);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      const creator = await storage.getUser(video.creatorId!);
      const videoWithCreator = {
        ...video,
        creator: creator ? {
          id: creator.id,
          username: creator.username,
          avatar: creator.avatar,
          isVerified: creator.isVerified,
          bio: creator.bio
        } : null
      };

      res.json(videoWithCreator);
    } catch (error) {
      console.error("Error fetching video:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/videos", async (req, res) => {
    try {
      const validatedData = insertVideoSchema.parse(req.body);
      const video = await storage.createVideo(validatedData);
      
      // Auto-list videos with prices on the smart contract
      if (video.price && parseFloat(video.price) > 0) {
        try {
          const listingResult = await filecoinPayService.listVideoForSale(video.id, video.price);
          if (listingResult.success) {
            console.log(`Video ${video.id} listed on smart contract for ${video.price} FIL`);
          } else {
            console.error('Failed to list video on smart contract:', listingResult.error);
          }
        } catch (error) {
          console.error('Smart contract listing error:', error);
        }
      }
      
      res.status(201).json(video);
    } catch (error) {
      console.error("Error creating video:", error);
      res.status(400).json({ error: "Invalid video data" });
    }
  });

  app.patch("/api/videos/:id/views", async (req, res) => {
    try {
      await storage.incrementViews(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error incrementing views:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // User routes
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const videos = await storage.getVideosByCreator(user.id);
      const userWithStats = {
        ...user,
        videoCount: videos.length,
        totalViews: videos.reduce((sum, video) => sum + (video.views || 0), 0)
      };

      res.json(userWithStats);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(validatedData);
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(400).json({ error: "Invalid user data" });
    }
  });

  // Featured creators
  app.get("/api/creators/featured", async (req, res) => {
    try {
      const videos = await storage.getAllVideos();
      const creatorVideoCount = new Map<string, number>();
      const creatorTotalViews = new Map<string, number>();

      videos.forEach(video => {
        if (video.creatorId) {
          creatorVideoCount.set(video.creatorId, (creatorVideoCount.get(video.creatorId) || 0) + 1);
          creatorTotalViews.set(video.creatorId, (creatorTotalViews.get(video.creatorId) || 0) + (video.views || 0));
        }
      });

      const allUsers = Array.from(new Set(videos.map(v => v.creatorId))).filter(Boolean) as string[];
      const creators = await Promise.all(allUsers.map(async (userId) => {
        const user = await storage.getUser(userId);
        if (!user) return null;
        
        return {
          ...user,
          videoCount: creatorVideoCount.get(userId) || 0,
          totalViews: creatorTotalViews.get(userId) || 0
        };
      }));

      const featuredCreators = creators
        .filter(Boolean)
        .sort((a, b) => (b!.totalViews || 0) - (a!.totalViews || 0))
        .slice(0, 6);

      res.json(featuredCreators);
    } catch (error) {
      console.error("Error fetching featured creators:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Real Filecoin Pay video purchase endpoint
  app.post("/api/videos/:id/purchase", async (req, res) => {
    try {
      const { buyerAddress, transactionHash } = req.body;
      const video = await storage.getVideo(req.params.id);
      
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      if (!video.price || parseFloat(video.price) <= 0) {
        return res.status(400).json({ error: "Video is not for sale" });
      }

      // Get creator wallet address (where payments should go)
      const creatorAddress = filecoinPayService.getCreatorAddress();
      if (!creatorAddress) {
        return res.status(500).json({ error: "Creator wallet not configured" });
      }

      if (transactionHash) {
        // Check for USDFC payment method and use Synapse SDK verification
        const paymentMethod = req.body.paymentMethod;
        let verification = false;
        
        if (paymentMethod === 'usdfc' && synapseService.isConnected()) {
          console.log('Verifying USDFC payment via Synapse SDK...');
          
          try {
            const verificationResult = await synapseService.verifyContentPayment(
              buyerAddress,
              req.params.id,
              video.price
            );
            verification = verificationResult.verified;
            
            if (verification) {
              console.log('USDFC payment verified via Synapse SDK');
            } else {
              console.log('USDFC verification failed:', verificationResult.error);
            }
          } catch (synapseError) {
            console.error('Synapse payment verification error:', synapseError);
            // Fall back to traditional verification
            verification = await filecoinPayService.hasPurchasedVideo(buyerAddress, req.params.id);
          }
        } else {
          // Traditional Filecoin payment verification
          verification = await filecoinPayService.hasPurchasedVideo(buyerAddress, req.params.id);
        }
        
        if (verification) {
          // Create purchase record
          const purchase = await storage.createPurchase({
            userId: buyerAddress,
            videoId: req.params.id,
            amount: video.price,
            transactionHash,
            paymentMethod: paymentMethod || 'filecoin'
          });

          return res.json({ 
            success: true, 
            purchase,
            paymentMethod: paymentMethod || 'filecoin',
            message: paymentMethod === 'usdfc' 
              ? "USDFC payment verified via Synapse SDK"
              : "Video purchase verified successfully"
          });
        } else {
          return res.status(400).json({ error: "Transaction verification failed" });
        }
      } else {
        // Return transaction details for MetaMask
        const paymentDetails = {
          amount: video.price,
          recipient: creatorAddress,
          videoId: req.params.id,
          buyerAddress
        };

        const transaction = filecoinPayService.createPaymentTransaction(paymentDetails);
        const gasCost = await filecoinPayService.estimateGasCost(paymentDetails);
        
        return res.json({
          success: true,
          transaction,
          gasCost,
          videoPrice: video.price,
          creatorAddress,
          contractAddress: filecoinPayService.getContractInfo()?.address
        });
      }
    } catch (error) {
      console.error("Purchase error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Legacy purchase endpoint for backwards compatibility
  app.post("/api/purchases", async (req, res) => {
    try {
      const validatedData = insertPurchaseSchema.parse(req.body);
      const purchase = await storage.createPurchase(validatedData);
      res.status(201).json(purchase);
    } catch (error) {
      console.error("Error creating purchase:", error);
      res.status(400).json({ error: "Invalid purchase data" });
    }
  });

  app.get("/api/users/:userId/purchases/:videoId", async (req, res) => {
    try {
      const purchase = await storage.getPurchase(req.params.userId, req.params.videoId);
      res.json({ hasPurchased: !!purchase });
    } catch (error) {
      console.error("Error checking purchase:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Object storage routes for video uploads
  app.post("/api/objects/upload", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/videos/:id/file", async (req, res) => {
    try {
      if (!req.body.videoURL) {
        return res.status(400).json({ error: "videoURL is required" });
      }

      // Check if this should be stored on Filecoin via Synapse SDK
      if (req.body.useFilecoin && req.body.videoBuffer) {
        try {
          // Store video on Filecoin using Synapse SDK → WarmStorage + PDP proof
          const videoBuffer = Buffer.from(req.body.videoBuffer, 'base64');
          const filename = req.body.filename || `video-${req.params.id}.mp4`;
          const mimeType = req.body.mimeType || 'video/mp4';
          
          console.log('Attempting Synapse SDK upload for video:', filename);
          
          if (synapseService.isConnected()) {
            const synapseResult = await synapseService.uploadFile(videoBuffer, filename, mimeType);
            
            if (synapseResult.success) {
              console.log('Synapse SDK upload successful:', synapseResult);
              
              // Create FilCDN URL for optimized retrieval
              const filcdnUrl = `/api/videos/${synapseResult.pieceCid}/stream`;
              
              // Update video with Synapse/Filecoin information
              const updatedVideo = await storage.updateVideo(req.params.id, {
                videoUrl: filcdnUrl,
                filecoinData: {
                  pieceCid: synapseResult.pieceCid,
                  commP: synapseResult.commP,
                  datasetId: synapseResult.datasetId,
                  transactionHash: synapseResult.transactionHash,
                  storageType: 'filecoin'
                }
              });

              if (!updatedVideo) {
                return res.status(404).json({ error: "Video not found" });
              }

              return res.json({ 
                objectPath: filcdnUrl,
                filecoinData: {
                  pieceCid: synapseResult.pieceCid,
                  commP: synapseResult.commP,
                  datasetId: synapseResult.datasetId,
                  pdpProof: { verified: true, method: 'synapse_sdk' },
                  storageType: 'filecoin'
                },
                message: 'Video stored on Filecoin with PDP proof via Synapse SDK'
              });
            } else {
              console.error("Synapse SDK upload failed:", synapseResult.error);
              // Fall back to legacy Filecoin service or regular storage
            }
          } else {
            console.log('Synapse SDK not connected, trying legacy Filecoin service...');
            
            // Fallback to legacy filecoinService if available
            const filecoinResult = await filecoinService.storeVideo(videoBuffer, filename);
            
            // Update video with legacy Filecoin information
            const updatedVideo = await storage.updateVideo(req.params.id, {
              videoUrl: filecoinResult.publicURL
            });

            if (!updatedVideo) {
              return res.status(404).json({ error: "Video not found" });
            }

            return res.json({ 
              objectPath: filecoinResult.publicURL,
              filecoinCid: filecoinResult.cid,
              pdpProof: filecoinResult.pdpProof,
              verified: filecoinResult.pdpProof?.verified || false,
              message: 'Video stored via legacy Filecoin service'
            });
          }
        } catch (filecoinError) {
          console.error("Filecoin storage error:", filecoinError);
          // Fall back to regular object storage
        }
      }

      // Regular object storage fallback
      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(req.body.videoURL);

      const updatedVideo = await storage.updateVideo(req.params.id, {
        videoUrl: objectPath
      });

      if (!updatedVideo) {
        return res.status(404).json({ error: "Video not found" });
      }

      res.json({ objectPath });
    } catch (error) {
      console.error("Error updating video file:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Serve video files
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving video file:", error);
      res.status(404).json({ error: "File not found" });
    }
  });

  // FilCDN video streaming endpoint for Synapse SDK uploads
  app.get("/api/videos/:pieceCid/stream", async (req, res) => {
    try {
      const { pieceCid } = req.params;
      
      if (!pieceCid) {
        return res.status(400).json({ error: "Piece CID is required" });
      }

      console.log('Streaming video via FilCDN:', pieceCid);

      if (!synapseService.isConnected()) {
        console.error('Synapse SDK not connected for FilCDN streaming');
        return res.status(503).json({ 
          error: "Filecoin streaming service unavailable",
          fallback: "Please use traditional storage"
        });
      }

      // Retrieve file from Filecoin via FilCDN using Synapse SDK
      const retrievalResult = await synapseService.retrieveFile(pieceCid);

      if (!retrievalResult.success) {
        console.error('FilCDN retrieval failed:', retrievalResult.error);
        return res.status(404).json({ 
          error: "Video not found on Filecoin network",
          details: retrievalResult.error
        });
      }

      if (!retrievalResult.data) {
        return res.status(500).json({ error: "No video data retrieved" });
      }

      // Set appropriate headers for video streaming
      const mimeType = retrievalResult.mimeType || 'video/mp4';
      const dataBuffer = Buffer.from(retrievalResult.data);

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', dataBuffer.length);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      res.setHeader('X-Served-By', 'FilCDN-Synapse-SDK');

      // Handle range requests for video seeking
      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : dataBuffer.length - 1;
        const chunksize = (end - start) + 1;
        const chunk = dataBuffer.slice(start, end + 1);

        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${dataBuffer.length}`);
        res.setHeader('Content-Length', chunksize);
        res.end(chunk);
      } else {
        res.status(200);
        res.end(dataBuffer);
      }

      console.log(`FilCDN streaming successful for ${pieceCid}, size: ${dataBuffer.length} bytes`);

    } catch (error) {
      console.error("FilCDN streaming error:", error);
      res.status(500).json({ 
        error: "Filecoin streaming failed",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
