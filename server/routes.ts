import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertVideoSchema, insertUserSchema, insertPurchaseSchema } from "@shared/schema";
import { ObjectStorageService } from "./objectStorage";
import { filecoinService } from "./filecoinService";
import { filecoinPayService } from "./filecoinPay";

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

  // Purchase routes with Filecoin Pay integration
  app.post("/api/purchases", async (req, res) => {
    try {
      const validatedData = insertPurchaseSchema.parse(req.body);
      
      // Verify the Filecoin transaction if provided
      if (validatedData.transactionHash) {
        const video = await storage.getVideo(validatedData.videoId!);
        if (!video) {
          return res.status(404).json({ error: "Video not found" });
        }

        // Verify payment on Filecoin network
        const paymentVerified = await filecoinPayService.verifyPayment(
          validatedData.transactionHash,
          video.price,
          "0x742d35cc6634c0532925a3b8d5c0b5e1ba64e2c1" // Platform wallet address
        );

        if (!paymentVerified) {
          return res.status(400).json({ error: "Payment verification failed" });
        }
      }
      
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

      // Check if this should be stored on Filecoin
      if (req.body.useFilecoin && req.body.videoBuffer) {
        try {
          // Store video on Filecoin using WarmStorage
          const videoBuffer = Buffer.from(req.body.videoBuffer, 'base64');
          const filename = req.body.filename || `video-${req.params.id}.mp4`;
          
          const filecoinResult = await filecoinService.storeVideo(videoBuffer, filename);
          
          // Update video with Filecoin information
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
            verified: filecoinResult.pdpProof.verified
          });
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

  const httpServer = createServer(app);
  return httpServer;
}
