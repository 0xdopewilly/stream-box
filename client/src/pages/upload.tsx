import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CloudUpload, Shield, Wallet, AlertTriangle } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/contexts/WalletContext";
import { apiRequest } from "@/lib/queryClient";
import type { UploadResult } from "@uppy/core";

interface VideoFormData {
  title: string;
  description: string;
  category: string;
  pricingType: 'free' | 'payper' | 'subscription';
  price: string;
}

export default function Upload() {
  const [formData, setFormData] = useState<VideoFormData>({
    title: "",
    description: "",
    category: "",
    pricingType: "free",
    price: "0",
  });
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isConnected, isFilecoinNetwork, connectWallet, isConnecting, address } = useWallet();

  // Redirect to home if wallet not connected
  useEffect(() => {
    if (!isConnected && !isConnecting) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to upload videos.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    }
  }, [isConnected, isConnecting, toast]);

  const createVideoMutation = useMutation({
    mutationFn: async (videoData: any) => {
      const response = await apiRequest("POST", "/api/videos", videoData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      toast({
        title: "Success!",
        description: "Your video has been uploaded and will be processed shortly.",
      });
      // Reset form
      setFormData({
        title: "",
        description: "",
        category: "",
        pricingType: "free",
        price: "0",
      });
      setUploadedVideoUrl("");
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: "There was an error uploading your video. Please try again.",
        variant: "destructive",
      });
      console.error("Upload error:", error);
    },
  });

  const updateVideoFileMutation = useMutation({
    mutationFn: async ({ videoId, videoURL }: { videoId: string; videoURL: string }) => {
      const response = await apiRequest("PUT", `/api/videos/${videoId}/file`, { videoURL });
      return response.json();
    },
  });

  const handleGetUploadParameters = async () => {
    try {
      const response = await apiRequest("POST", "/api/objects/upload", {});
      const { uploadURL } = await response.json();
      return {
        method: "PUT" as const,
        url: uploadURL,
      };
    } catch (error) {
      console.error("Error getting upload parameters:", error);
      throw error;
    }
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      setUploadedVideoUrl(uploadedFile.uploadURL || "");
      toast({
        title: "File uploaded successfully!",
        description: "Your video has been uploaded to Filecoin storage.",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a video title.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.category) {
      toast({
        title: "Validation Error", 
        description: "Please select a category.",
        variant: "destructive",
      });
      return;
    }

    if (!uploadedVideoUrl) {
      toast({
        title: "Validation Error",
        description: "Please upload a video file first.",
        variant: "destructive",
      });
      return;
    }

    if (formData.pricingType === 'payper' && (!formData.price || parseFloat(formData.price) <= 0)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid price for pay-per-view videos.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      // Ensure wallet is connected before uploading
      if (!isConnected || !address) {
        toast({
          title: "Wallet Required",
          description: "Please connect your wallet to upload videos.",
          variant: "destructive",
        });
        return;
      }

      if (!isFilecoinNetwork) {
        toast({
          title: "Wrong Network",
          description: "Please switch to Filecoin network to upload videos.",
          variant: "destructive",
        });
        return;
      }

      // Create video record
      const videoData = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category,
        price: formData.pricingType === 'payper' ? formData.price : "0",
        pricingType: formData.pricingType,
        videoUrl: "/temp", // temporary, will be updated
        creatorId: address, // Use connected wallet address as creator ID
      };

      const createdVideo = await createVideoMutation.mutateAsync(videoData);

      // Update with actual video file URL
      await updateVideoFileMutation.mutateAsync({
        videoId: createdVideo.id,
        videoURL: uploadedVideoUrl,
      });
      
    } catch (error) {
      console.error("Error creating video:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSearch = (query: string) => {
    window.location.href = `/discover?search=${encodeURIComponent(query)}`;
  };

  const categories = [
    "Technology",
    "Art", 
    "Music",
    "Education",
    "Entertainment",
    "Fitness",
    "Gaming",
    "Cooking",
    "Travel",
    "Business"
  ];

  // Show wallet connection requirement if not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header onSearch={handleSearch} />
        
        <main className="pt-20">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto text-center">
              <Alert className="mb-8">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  You need to connect your wallet to upload videos to StreamBox.
                </AlertDescription>
              </Alert>
              
              <div className="bg-card rounded-xl p-12 border">
                <Wallet className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
                <h1 className="text-3xl font-bold mb-4">Connect Your Wallet</h1>
                <p className="text-muted-foreground text-lg mb-8">
                  StreamBox uses decentralized technology. Connect your wallet to upload, monetize, and manage your content on the blockchain.
                </p>
                
                <Button
                  size="lg"
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg font-semibold"
                >
                  <Wallet className="h-5 w-5 mr-2" />
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </Button>
                
                <p className="text-sm text-muted-foreground mt-6">
                  By connecting your wallet, you agree to use Filecoin network for secure, decentralized storage.
                </p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Show network error if not on Filecoin network
  if (!isFilecoinNetwork) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header onSearch={handleSearch} />
        
        <main className="pt-20">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto text-center">
              <Alert className="mb-8">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Please switch to Filecoin Calibration network to upload videos.
                </AlertDescription>
              </Alert>
              
              <div className="bg-card rounded-xl p-12 border">
                <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
                <h1 className="text-3xl font-bold mb-4">Wrong Network</h1>
                <p className="text-muted-foreground text-lg mb-8">
                  StreamBox requires Filecoin Calibration network for secure, decentralized video storage. Please switch networks in your wallet.
                </p>
                
                <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2">
                  Current: {address ? address.slice(0, 6) + '...' + address.slice(-4) : 'Unknown'}
                </Badge>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header onSearch={handleSearch} />
      
      <main className="pt-20">
        <div className="container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4" data-testid="upload-title">Upload Your Video</h1>
              <p className="text-muted-foreground text-lg">
                Share your content with the world using decentralized storage and built-in monetization
              </p>
              
              {/* Wallet Status */}
              <div className="flex items-center justify-center gap-2 mt-4">
                <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                  ✓ Wallet Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
                </Badge>
                <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                  ✓ Filecoin Network
                </Badge>
              </div>
            </div>
            
            <form onSubmit={handleSubmit}>
              <Card className="bg-card rounded-xl p-8 border">
                {/* File Upload Section */}
                <div className="mb-8">
                  <Label className="text-lg font-semibold mb-4 block">Upload Video File</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary transition-colors">
                    {!uploadedVideoUrl ? (
                      <div>
                        <CloudUpload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">Drop your video files here</h3>
                        <p className="text-muted-foreground mb-4">or click to browse from your device</p>
                        <ObjectUploader
                          maxNumberOfFiles={1}
                          maxFileSize={5368709120} // 5GB
                          onGetUploadParameters={handleGetUploadParameters}
                          onComplete={handleUploadComplete}
                        >
                          <div className="flex items-center gap-2">
                            <CloudUpload className="h-5 w-5" />
                            <span>Choose Video File</span>
                          </div>
                        </ObjectUploader>
                        <div className="mt-4 text-sm text-muted-foreground">
                          Supported formats: MP4, MOV, AVI • Max size: 5GB
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-4" data-testid="upload-success">
                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                          <i className="fas fa-check text-white"></i>
                        </div>
                        <div className="text-left">
                          <h4 className="font-semibold text-green-500">Video uploaded successfully!</h4>
                          <p className="text-sm text-muted-foreground">Your video is stored on Filecoin</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Video Details */}
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h2 className="text-lg font-semibold">Video Details</h2>
                    
                    <div>
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        placeholder="Enter video title..."
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="mt-1"
                        data-testid="input-title"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe your video..."
                        rows={4}
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="mt-1 resize-none"
                        data-testid="textarea-description"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="category">Category *</Label>
                      <Select 
                        value={formData.category} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger className="mt-1" data-testid="select-category">
                          <SelectValue placeholder="Select category..." />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Monetization */}
                  <div className="space-y-6">
                    <h2 className="text-lg font-semibold">Monetization</h2>
                    
                    <RadioGroup
                      value={formData.pricingType}
                      onValueChange={(value: 'free' | 'payper' | 'subscription') => 
                        setFormData(prev => ({ ...prev, pricingType: value, price: value === 'free' ? '0' : prev.price }))
                      }
                      className="space-y-4"
                      data-testid="pricing-options"
                    >
                      <div className="bg-secondary rounded-lg p-4">
                        <div className="flex items-center space-x-3 mb-2">
                          <RadioGroupItem value="free" id="free" />
                          <Label htmlFor="free" className="font-medium">Free to Watch</Label>
                        </div>
                        <p className="text-sm text-muted-foreground ml-6">Anyone can watch this video</p>
                      </div>
                      
                      <div className="bg-secondary rounded-lg p-4">
                        <div className="flex items-center space-x-3 mb-2">
                          <RadioGroupItem value="payper" id="payper" />
                          <Label htmlFor="payper" className="font-medium">Pay-per-View</Label>
                        </div>
                        <div className="ml-6 space-y-2">
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              placeholder="0.00"
                              step="0.01"
                              min="0"
                              className="w-32"
                              value={formData.price}
                              onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                              disabled={formData.pricingType !== 'payper'}
                              data-testid="input-price"
                            />
                            <span className="text-sm text-muted-foreground">USD</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-secondary rounded-lg p-4">
                        <div className="flex items-center space-x-3 mb-2">
                          <RadioGroupItem value="subscription" id="subscription" />
                          <Label htmlFor="subscription" className="font-medium">Subscription Only</Label>
                        </div>
                        <p className="text-sm text-muted-foreground ml-6">Requires active subscription</p>
                      </div>
                    </RadioGroup>
                    
                    <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Shield className="h-4 w-4 text-accent" />
                        <span className="font-medium text-accent">Filecoin Verification</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Your video will be stored with cryptographic proof of authenticity
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Submit Button */}
                <div className="mt-8 flex justify-end">
                  <Button 
                    type="submit"
                    size="lg"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 font-semibold"
                    disabled={isUploading || createVideoMutation.isPending}
                    data-testid="submit-button"
                  >
                    {isUploading || createVideoMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Uploading to Filecoin...
                      </>
                    ) : (
                      <>
                        <CloudUpload className="h-5 w-5 mr-2" />
                        Upload to Filecoin
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
