import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface CreatorCardProps {
  id: string;
  username: string;
  bio?: string;
  avatar?: string;
  isVerified: boolean;
  videoCount: number;
  totalViews: number;
}

export function CreatorCard({
  id,
  username,
  bio,
  avatar,
  isVerified,
  videoCount,
  totalViews,
}: CreatorCardProps) {
  const formatViews = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <Card className="bg-background rounded-xl p-6 text-center group hover:scale-105 transition-transform border border-border" data-testid={`creator-card-${id}`}>
      <div className="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden bg-primary flex items-center justify-center">
        {avatar ? (
          <img 
            src={avatar} 
            alt={username}
            className="w-full h-full object-cover"
            data-testid={`creator-avatar-${id}`}
          />
        ) : (
          <span className="text-2xl font-bold text-primary-foreground" data-testid={`creator-initial-${id}`}>
            {username.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <h3 className="text-xl font-semibold mb-2" data-testid={`creator-name-${id}`}>
        {username}
        {isVerified && (
          <i className="fas fa-check-circle text-accent ml-2" data-testid={`creator-verified-${id}`}></i>
        )}
      </h3>
      <p className="text-muted-foreground mb-4 text-sm" data-testid={`creator-bio-${id}`}>
        {bio || "Content Creator"}
      </p>
      <div className="flex justify-center space-x-6 mb-4">
        <div className="text-center">
          <div className="text-lg font-bold" data-testid={`creator-video-count-${id}`}>
            {videoCount}
          </div>
          <div className="text-sm text-muted-foreground">Videos</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold" data-testid={`creator-total-views-${id}`}>
            {formatViews(totalViews)}
          </div>
          <div className="text-sm text-muted-foreground">Views</div>
        </div>
      </div>
      <Button 
        className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
        data-testid={`follow-button-${id}`}
      >
        Follow
      </Button>
    </Card>
  );
}
