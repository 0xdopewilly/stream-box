import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { VideoCard } from "@/components/VideoCard";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Video {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl: string;
  duration: number;
  views: number;
  price: string;
  pricingType: string;
  category: string;
  isVerified: boolean;
  creator: {
    username: string;
    avatar?: string;
    isVerified: boolean;
  } | null;
}

const categories = ["All", "Technology", "Art", "Music", "Education", "Entertainment", "Fitness"];

export default function Discover() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Get search query from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const search = urlParams.get('search');
    if (search) {
      setSearchQuery(search);
    }
  }, []);

  const { data: videos = [], isLoading } = useQuery<Video[]>({
    queryKey: ["/api/videos", { 
      category: selectedCategory === "All" ? undefined : selectedCategory,
      search: searchQuery || undefined 
    }],
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Update URL without page reload
    const url = new URL(window.location.href);
    if (query) {
      url.searchParams.set('search', query);
    } else {
      url.searchParams.delete('search');
    }
    window.history.pushState({}, '', url);
  };

  const filteredVideos = videos;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header onSearch={handleSearch} />
      
      <main className="pt-20">
        <div className="container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4" data-testid="discover-title">
              {searchQuery ? `Search Results for "${searchQuery}"` : "Discover Videos"}
            </h1>
            <p className="text-muted-foreground text-lg">
              Explore amazing content from creators around the world
            </p>
          </div>

          {/* Category Filter */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className={selectedCategory === category ? "bg-primary text-primary-foreground" : ""}
                  data-testid={`category-${category.toLowerCase()}`}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* Results */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" data-testid="loading-skeleton">
              {Array.from({ length: 12 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="aspect-video bg-muted rounded-t-lg" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-muted rounded" />
                    <div className="h-3 bg-muted rounded w-3/4" />
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredVideos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" data-testid="video-grid">
              {filteredVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  {...video}
                  className="w-full"
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16" data-testid="no-results">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-search text-4xl text-muted-foreground"></i>
                </div>
                <h3 className="text-xl font-semibold mb-2">No videos found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery 
                    ? `We couldn't find any videos matching "${searchQuery}"`
                    : "No videos available in this category"
                  }
                </p>
                {searchQuery && (
                  <Button 
                    onClick={() => handleSearch("")}
                    data-testid="clear-search-button"
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
