import { Play, Shield, Clock, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

interface VideoCardProps {
  id: string;
  title: string;
  thumbnailUrl: string;
  duration: number;
  views: number;
  price: string;
  pricingType: string;
  creator: {
    username: string;
    avatar?: string;
    isVerified: boolean;
  } | null;
  isVerified: boolean;
  className?: string;
}

export function VideoCard({
  id,
  title,
  thumbnailUrl,
  duration,
  views,
  price,
  pricingType,
  creator,
  isVerified,
  className = "w-80"
}: VideoCardProps) {
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatViews = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const displayPrice = pricingType === 'free' ? 'Free' : `$${price}`;

  return (
    <div className={`video-card flex-shrink-0 ${className}`} data-testid={`video-card-${id}`}>
      <Link href={`/video/${id}`}>
        <Card className="relative rounded-lg overflow-hidden bg-card group cursor-pointer border-0">
          <div className="relative">
            <img 
              src={thumbnailUrl}
              alt={title}
              className="w-full h-48 object-cover"
              data-testid={`video-thumbnail-${id}`}
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Play className="text-white h-12 w-12" />
            </div>
            {isVerified && (
              <Badge className="absolute top-3 right-3 bg-accent text-accent-foreground text-xs" data-testid={`verified-badge-${id}`}>
                <Shield className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
            <div className="absolute bottom-3 right-3 bg-black/80 text-white px-2 py-1 rounded text-xs">
              <Clock className="h-3 w-3 mr-1 inline" />
              {formatDuration(duration)}
            </div>
          </div>
        </Card>
      </Link>
      <div className="mt-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-2" data-testid={`video-title-${id}`}>
          {title}
        </h3>
        {creator && (
          <div className="flex items-center space-x-3 mb-2">
            <div 
              className="w-8 h-8 rounded-full creator-avatar bg-primary flex items-center justify-center overflow-hidden"
              data-testid={`creator-avatar-${id}`}
            >
              {creator.avatar ? (
                <img src={creator.avatar} alt={creator.username} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-primary-foreground">
                  {creator.username.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <span className="text-muted-foreground" data-testid={`creator-name-${id}`}>
              {creator.username}
            </span>
            <span className="text-primary font-medium" data-testid={`video-price-${id}`}>
              {displayPrice}
            </span>
          </div>
        )}
        <div className="flex items-center text-sm text-muted-foreground space-x-4">
          <span className="flex items-center" data-testid={`video-views-${id}`}>
            <Eye className="h-4 w-4 mr-1" />
            {formatViews(views)} views
          </span>
        </div>
      </div>
    </div>
  );
}
