import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, Maximize, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  videoUrl: string;
  title: string;
  description?: string;
  thumbnailUrl: string;
  price: string;
  pricingType: string;
  creator: {
    id: string;
    username: string;
    avatar?: string;
    isVerified: boolean;
  } | null;
  filecoinHash?: string;
  isVerified: boolean;
  hasPurchased?: boolean;
  onPurchase?: () => void;
}

export function VideoPlayer({
  videoUrl,
  title,
  description,
  thumbnailUrl,
  price,
  pricingType,
  creator,
  filecoinHash,
  isVerified,
  hasPurchased = false,
  onPurchase,
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const canWatch = pricingType === 'free' || hasPurchased;

  useEffect(() => {
    if (pricingType !== 'free' && !hasPurchased) {
      setShowPaywall(true);
    }
  }, [pricingType, hasPurchased]);

  const togglePlayPause = () => {
    if (!canWatch) {
      setShowPaywall(true);
      return;
    }

    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  const displayPrice = pricingType === 'free' ? 'Free' : `$${price}`;

  return (
    <div className="max-w-4xl mx-auto" data-testid="video-player">
      <Card className="bg-card rounded-xl overflow-hidden shadow-2xl border-0">
        {/* Video Player Frame */}
        <div className="relative aspect-video bg-black">
          {canWatch ? (
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              poster={thumbnailUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              data-testid="video-element"
            >
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          ) : (
            <img 
              src={thumbnailUrl} 
              alt={title}
              className="w-full h-full object-cover"
              data-testid="video-poster"
            />
          )}
          
          {/* Video Controls Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="flex items-center space-x-4 mb-4">
                <Button
                  size="lg"
                  className="w-12 h-12 bg-primary rounded-full hover:bg-primary/90"
                  onClick={togglePlayPause}
                  data-testid="play-pause-button"
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
                <div className="flex-1">
                  <div className="h-1 bg-white/30 rounded-full">
                    <div 
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
                <span className="text-white text-sm" data-testid="video-time">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
                <Button size="sm" variant="ghost" className="text-white hover:text-primary">
                  <Volume2 className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" className="text-white hover:text-primary">
                  <Maximize className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* Verification Badge */}
          {isVerified && filecoinHash && (
            <div className="absolute top-4 right-4 bg-background/95 backdrop-blur-sm rounded-lg p-4 border border-border">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium" data-testid="verification-status">Verified Content</span>
              </div>
              <div className="text-xs text-muted-foreground" data-testid="filecoin-hash">
                Proof hash: {filecoinHash.slice(0, 10)}...{filecoinHash.slice(-6)}
              </div>
            </div>
          )}

          {/* Paywall Overlay */}
          {showPaywall && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
              <Card className="bg-background p-8 max-w-md mx-4 text-center">
                <h3 className="text-2xl font-bold mb-4" data-testid="paywall-title">Premium Content</h3>
                <p className="text-muted-foreground mb-6" data-testid="paywall-description">
                  This video requires a one-time purchase to watch.
                </p>
                <div className="text-3xl font-bold text-primary mb-6" data-testid="paywall-price">
                  {displayPrice}
                </div>
                <div className="space-y-3">
                  <Button 
                    size="lg"
                    className="w-full bg-primary hover:bg-primary/90"
                    onClick={() => {
                      onPurchase?.();
                      setShowPaywall(false);
                    }}
                    data-testid="purchase-button"
                  >
                    Purchase & Watch Now
                  </Button>
                  <Button 
                    size="lg"
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowPaywall(false)}
                    data-testid="close-paywall-button"
                  >
                    Preview Only
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
        
        {/* Video Info */}
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-2" data-testid="video-title">{title}</h1>
              {creator && (
                <div className="flex items-center space-x-4 text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center overflow-hidden">
                      {creator.avatar ? (
                        <img src={creator.avatar} alt={creator.username} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-primary-foreground">
                          {creator.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span data-testid="creator-name">{creator.username}</span>
                    {creator.isVerified && (
                      <Badge variant="secondary" className="text-xs">
                        <Shield className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {pricingType !== 'free' && !hasPurchased && (
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary" data-testid="video-price">{displayPrice}</div>
                  <div className="text-sm text-muted-foreground">One-time purchase</div>
                </div>
                <Button 
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  onClick={onPurchase}
                  data-testid="watch-now-button"
                >
                  Watch Now
                </Button>
              </div>
            )}
          </div>
          
          {description && (
            <div className="mt-6 p-4 bg-secondary rounded-lg">
              <h4 className="font-semibold mb-2">About this video</h4>
              <p className="text-muted-foreground text-sm" data-testid="video-description">
                {description}
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
