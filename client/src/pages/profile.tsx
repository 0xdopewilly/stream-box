import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { VideoCard } from "@/components/VideoCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useWallet } from "@/contexts/WalletContext";
import { useToast } from "@/hooks/use-toast";
import { User, Video, Wallet, TrendingUp, Upload, AlertTriangle } from "lucide-react";

interface Video {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl: string;
  videoUrl: string;
  duration: number;
  views: number;
  price: string;
  pricingType: string;
  category: string;
  isVerified: boolean;
  filecoinHash?: string;
  creatorId: string;
  creator: {
    id: string;
    username: string;
    bio?: string;
    avatar?: string;
    isVerified: boolean;
  } | null;
}

interface Purchase {
  id: string;
  userId: string;
  videoId: string;
  amount: string;
  transactionHash: string;
  createdAt: string;
}

export default function Profile() {
  const { isConnected, address, isFilecoinNetwork, connectWallet } = useWallet();
  const { toast } = useToast();

  // Redirect if not connected
  useEffect(() => {
    if (!isConnected) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to view your profile.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    }
  }, [isConnected, toast]);

  // Fetch user's uploaded videos
  const { data: userVideos = [], isLoading: videosLoading } = useQuery<Video[]>({
    queryKey: ["/api/videos", "creator", address],
    enabled: !!address,
  });

  // Fetch earnings from purchases
  const { data: earnings = [], isLoading: earningsLoading } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases", "creator", address],
    enabled: !!address,
  });

  // Calculate total earnings
  const totalEarnings = earnings.reduce((sum, purchase) => {
    return sum + parseFloat(purchase.amount);
  }, 0);

  const totalViews = userVideos.reduce((sum, video) => sum + video.views, 0);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        
        <main className="pt-20">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto text-center">
              <Alert className="mb-8">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  You need to connect your wallet to view your profile.
                </AlertDescription>
              </Alert>
              
              <div className="bg-card rounded-xl p-12 border">
                <Wallet className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
                <h1 className="text-3xl font-bold mb-4">Connect Your Wallet</h1>
                <p className="text-muted-foreground text-lg mb-8">
                  Access your creator dashboard, view your uploaded videos, and track your earnings.
                </p>
                
                <Button
                  size="lg"
                  onClick={connectWallet}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg font-semibold"
                >
                  <Wallet className="h-5 w-5 mr-2" />
                  Connect Wallet
                </Button>
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
      <Header />
      
      <main className="pt-20">
        <div className="container mx-auto px-4 py-8">
          {/* Profile Header */}
          <div className="max-w-6xl mx-auto">
            <div className="bg-card rounded-xl p-8 border mb-8">
              <div className="flex items-center gap-6 mb-6">
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center">
                  <User className="h-10 w-10 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-2">Creator Dashboard</h1>
                  <p className="text-muted-foreground text-lg">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {isFilecoinNetwork ? (
                      <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                        ✓ Filecoin Network
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
                        ⚠ Wrong Network
                      </Badge>
                    )}
                    <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                      ✓ Verified Creator
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalEarnings.toFixed(4)} FIL</div>
                    <p className="text-xs text-muted-foreground">
                      From {earnings.length} purchases
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Videos Uploaded</CardTitle>
                    <Video className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{userVideos.length}</div>
                    <p className="text-xs text-muted-foreground">
                      Active content library
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      Across all videos
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Content Tabs */}
            <Tabs defaultValue="videos" className="space-y-8">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="videos">My Videos</TabsTrigger>
                <TabsTrigger value="earnings">Earnings</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="videos" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Your Uploaded Videos</h2>
                  <Button onClick={() => window.location.href = '/upload'}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload New Video
                  </Button>
                </div>

                {videosLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="bg-card rounded-lg p-4 animate-pulse">
                        <div className="bg-muted h-48 rounded mb-4"></div>
                        <div className="bg-muted h-4 rounded mb-2"></div>
                        <div className="bg-muted h-3 rounded w-2/3"></div>
                      </div>
                    ))}
                  </div>
                ) : userVideos.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {userVideos.map((video) => (
                      <VideoCard 
                        key={video.id}
                        id={video.id}
                        title={video.title}
                        thumbnailUrl={video.thumbnailUrl}
                        duration={video.duration}
                        views={video.views}
                        price={video.price}
                        pricingType={video.pricingType}
                        creator={video.creator}
                        isVerified={video.isVerified}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="p-12 text-center">
                    <Video className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Videos Yet</h3>
                    <p className="text-muted-foreground mb-6">
                      Start creating content and monetize your videos on the decentralized platform.
                    </p>
                    <Button onClick={() => window.location.href = '/upload'}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Your First Video
                    </Button>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="earnings" className="space-y-6">
                <h2 className="text-2xl font-bold">Earnings History</h2>

                {earningsLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="bg-card rounded-lg p-4 animate-pulse">
                        <div className="bg-muted h-4 rounded mb-2"></div>
                        <div className="bg-muted h-3 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : earnings.length > 0 ? (
                  <div className="space-y-4">
                    {earnings.map((purchase) => (
                      <Card key={purchase.id}>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold">Video Purchase</h3>
                              <p className="text-sm text-muted-foreground">
                                Transaction: {purchase.transactionHash.slice(0, 10)}...{purchase.transactionHash.slice(-6)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(purchase.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-green-600">
                                +{purchase.amount} FIL
                              </div>
                              <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                                Confirmed
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="p-12 text-center">
                    <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Earnings Yet</h3>
                    <p className="text-muted-foreground">
                      Upload videos and start earning from your content.
                    </p>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="analytics" className="space-y-6">
                <h2 className="text-2xl font-bold">Performance Analytics</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Revenue Overview</CardTitle>
                      <CardDescription>Your earnings breakdown</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span>Total Revenue</span>
                          <span className="font-semibold">{totalEarnings.toFixed(4)} FIL</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Platform Fee (5%)</span>
                          <span className="text-muted-foreground">-{(totalEarnings * 0.05).toFixed(4)} FIL</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>Net Earnings</span>
                          <span>{(totalEarnings * 0.95).toFixed(4)} FIL</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Content Performance</CardTitle>
                      <CardDescription>Your videos' performance metrics</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span>Average Views per Video</span>
                          <span className="font-semibold">
                            {userVideos.length > 0 ? Math.round(totalViews / userVideos.length).toLocaleString() : 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Conversion Rate</span>
                          <span className="font-semibold">
                            {totalViews > 0 ? ((earnings.length / totalViews) * 100).toFixed(2) : 0}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg. Revenue per Video</span>
                          <span className="font-semibold">
                            {userVideos.length > 0 ? (totalEarnings / userVideos.length).toFixed(4) : 0} FIL
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}