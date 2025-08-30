import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Header } from "@/components/Header";
import { VideoPlayer } from "@/components/VideoPlayer";
import { VideoCard } from "@/components/VideoCard";
import { Footer } from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { useFilecoinPay } from "@/hooks/useFilecoinPay";
import { useWallet } from "@/hooks/useWallet";
import { apiRequest } from "@/lib/queryClient";

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
  creator: {
    id: string;
    username: string;
    bio?: string;
    avatar?: string;
    isVerified: boolean;
  } | null;
}

export default function VideoPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { processPayment, isProcessing } = useFilecoinPay();
  const { isConnected, connectWallet } = useWallet();

  const { data: video, isLoading } = useQuery<Video>({
    queryKey: ["/api/videos", id],
    enabled: !!id,
  });

  const { data: relatedVideos = [] } = useQuery<Video[]>({
    queryKey: ["/api/videos", { category: video?.category }],
    enabled: !!video?.category,
  });

  const { data: purchaseData } = useQuery({
    queryKey: ["/api/users/user1/purchases", id],
    enabled: !!id && video?.pricingType === 'payper',
  });

  const incrementViewsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/videos/${id}/views`, {});
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async (purchaseData: any) => {
      const response = await apiRequest("POST", "/api/purchases", purchaseData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/user1/purchases", id] });
      toast({
        title: "Purchase successful!",
        description: "You can now watch this video.",
      });
    },
    onError: () => {
      toast({
        title: "Purchase failed",
        description: "There was an error processing your payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handlePurchase = async () => {
    if (!video) return;

    // Check wallet connection first
    if (!isConnected) {
      try {
        await connectWallet();
      } catch (error) {
        toast({
          title: "Wallet connection required",
          description: "Please connect your MetaMask wallet to make a purchase.",
          variant: "destructive",
        });
        return;
      }
    }

    // Process real Filecoin payment
    const paymentResult = await processPayment({
      amount: video.price,
      recipient: "0x742d35cc6634c0532925a3b8d5c0b5e1ba64e2c1", // Platform wallet
      videoId: video.id,
      purchaseType: 'single'
    });

    if (paymentResult.success && paymentResult.transactionHash) {
      // Create purchase record with real transaction hash
      const purchase = {
        userId: "user1", // In real app, get from wallet/auth
        videoId: video.id,
        amount: video.price,
        transactionHash: paymentResult.transactionHash,
      };

      purchaseMutation.mutate(purchase);
    }
  };

  const handleSearch = (query: string) => {
    window.location.href = `/discover?search=${encodeURIComponent(query)}`;
  };

  // Increment views when video loads
  useEffect(() => {
    if (video && !incrementViewsMutation.isSuccess && !incrementViewsMutation.isPending) {
      incrementViewsMutation.mutate();
    }
  }, [video?.id]); // Only run when video ID changes

  const hasPurchased = (purchaseData as any)?.hasPurchased || false;
  
  const filteredRelatedVideos = relatedVideos
    .filter(v => v.id !== video?.id)
    .slice(0, 4);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header onSearch={handleSearch} />
        <main className="pt-20">
          <div className="container mx-auto px-4 py-8">
            <div className="animate-pulse">
              <div className="aspect-video bg-muted rounded-lg mb-6" />
              <div className="space-y-4">
                <div className="h-8 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-20 bg-muted rounded" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header onSearch={handleSearch} />
        <main className="pt-20">
          <div className="container mx-auto px-4 py-8 text-center">
            <h1 className="text-2xl font-bold mb-4" data-testid="video-not-found">Video not found</h1>
            <p className="text-muted-foreground">The video you're looking for doesn't exist or has been removed.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header onSearch={handleSearch} />
      
      <main className="pt-20">
        <div className="container mx-auto px-4 py-8">
          {/* Video Player */}
          <div className="mb-12">
            <VideoPlayer
              videoUrl={video.videoUrl}
              title={video.title}
              description={video.description}
              thumbnailUrl={video.thumbnailUrl}
              price={video.price}
              pricingType={video.pricingType}
              creator={video.creator}
              filecoinHash={video.filecoinHash}
              isVerified={video.isVerified}
              hasPurchased={hasPurchased}
              onPurchase={handlePurchase}
            />
          </div>

          {/* Related Videos */}
          {filteredRelatedVideos.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-6" data-testid="related-videos-title">
                More from {video.category}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="related-videos">
                {filteredRelatedVideos.map((relatedVideo) => (
                  <VideoCard
                    key={relatedVideo.id}
                    {...relatedVideo}
                    className="w-full"
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
