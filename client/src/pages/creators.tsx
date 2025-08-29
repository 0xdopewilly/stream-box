import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { CreatorCard } from "@/components/CreatorCard";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";

interface Creator {
  id: string;
  username: string;
  bio?: string;
  avatar?: string;
  isVerified: boolean;
  videoCount: number;
  totalViews: number;
}

export default function Creators() {
  const { data: creators = [], isLoading } = useQuery<Creator[]>({
    queryKey: ["/api/creators/featured"],
  });

  const handleSearch = (query: string) => {
    // Navigate to discover page with search query
    window.location.href = `/discover?search=${encodeURIComponent(query)}`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header onSearch={handleSearch} />
      
      <main className="pt-20">
        <div className="container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold mb-4" data-testid="creators-title">Featured Creators</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Discover talented creators who are building amazing communities and sharing incredible content on StreamBox
            </p>
          </div>

          {/* Creators Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" data-testid="loading-skeleton">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse p-6">
                  <div className="w-24 h-24 bg-muted rounded-full mx-auto mb-4" />
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded mx-auto w-32" />
                    <div className="h-3 bg-muted rounded mx-auto w-24" />
                    <div className="h-8 bg-muted rounded mx-auto w-20 mt-4" />
                  </div>
                </Card>
              ))}
            </div>
          ) : creators.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" data-testid="creators-grid">
              {creators.map((creator) => (
                <CreatorCard
                  key={creator.id}
                  {...creator}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16" data-testid="no-creators">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-users text-4xl text-muted-foreground"></i>
                </div>
                <h3 className="text-xl font-semibold mb-2">No creators found</h3>
                <p className="text-muted-foreground">
                  Check back later for featured creators
                </p>
              </div>
            </div>
          )}

          {/* Call to Action */}
          <div className="mt-16">
            <Card className="bg-card p-8 text-center border">
              <h2 className="text-2xl font-bold mb-4" data-testid="cta-title">Ready to Start Creating?</h2>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Join our community of creators and start monetizing your content with decentralized technology. 
                Upload your videos, set your prices, and keep 95% of your earnings.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-lg font-semibold transition-colors"
                  onClick={() => window.location.href = '/upload'}
                  data-testid="cta-upload-button"
                >
                  Start Uploading
                </button>
                <button 
                  className="border border-border hover:bg-secondary text-foreground px-8 py-3 rounded-lg font-semibold transition-colors"
                  onClick={() => window.location.href = '/'}
                  data-testid="cta-learn-more-button"
                >
                  Learn More
                </button>
              </div>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
