import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Shield, Coins, Globe, CheckCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { VideoCard } from "@/components/VideoCard";
import { CreatorCard } from "@/components/CreatorCard";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Video {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl: string;
  duration: number;
  views: number;
  price: string;
  pricingType: string;
  isVerified: boolean;
  creator: {
    username: string;
    avatar?: string;
    isVerified: boolean;
  } | null;
}

interface Creator {
  id: string;
  username: string;
  bio?: string;
  avatar?: string;
  isVerified: boolean;
  videoCount: number;
  totalViews: number;
}

export default function Home() {
  const { data: trendingVideos = [] } = useQuery<Video[]>({
    queryKey: ["/api/videos", { trending: 8 }],
  });

  const { data: featuredCreators = [] } = useQuery<Creator[]>({
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
        {/* Hero Section */}
        <HeroSection />

        {/* Trending Videos */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold" data-testid="trending-title">Trending Now</h2>
              <Button 
                variant="ghost" 
                className="text-primary hover:text-primary/80 font-medium"
                onClick={() => window.location.href = '/discover'}
                data-testid="view-all-trending"
              >
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex gap-6 overflow-x-auto scrollbar-hide pb-4" data-testid="trending-videos">
              {trendingVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  {...video}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Featured Creators */}
        <section className="py-16 bg-card">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4" data-testid="featured-creators-title">Featured Creators</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Discover talented creators building their communities on StreamBox
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" data-testid="featured-creators">
              {featuredCreators.slice(0, 3).map((creator) => (
                <CreatorCard
                  key={creator.id}
                  {...creator}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Platform Benefits */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4" data-testid="benefits-title">Why Choose StreamBox?</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Experience the future of video streaming with decentralized technology
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center" data-testid="benefit-tamper-proof">
                <div className="w-16 h-16 bg-primary rounded-xl mx-auto mb-6 flex items-center justify-center">
                  <Shield className="text-primary-foreground h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Tamper-Proof Storage</h3>
                <p className="text-muted-foreground">
                  Your content is stored on Filecoin with cryptographic proofs, ensuring it can never be altered or removed without your permission.
                </p>
              </div>
              
              <div className="text-center" data-testid="benefit-monetization">
                <div className="w-16 h-16 bg-accent rounded-xl mx-auto mb-6 flex items-center justify-center">
                  <Coins className="text-accent-foreground h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Direct Monetization</h3>
                <p className="text-muted-foreground">
                  Keep 95% of your earnings with Filecoin Pay. No middleman fees or complex payment processing required.
                </p>
              </div>
              
              <div className="text-center" data-testid="benefit-cdn">
                <div className="w-16 h-16 bg-green-500 rounded-xl mx-auto mb-6 flex items-center justify-center">
                  <Globe className="text-white h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Global CDN</h3>
                <p className="text-muted-foreground">
                  FilCDN ensures your videos load instantly worldwide with distributed edge caching and optimized delivery.
                </p>
              </div>
            </div>
            
            <div className="mt-16">
              <Card className="bg-card rounded-xl p-8 border">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <h3 className="text-2xl font-bold mb-4" data-testid="pdp-title">Proof of Data Possession</h3>
                    <p className="text-muted-foreground mb-6">
                      Every video comes with verifiable proof that the content is authentic and hasn't been tampered with. 
                      Your audience can trust what they're watching is exactly what you uploaded.
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3" data-testid="pdp-feature-1">
                        <CheckCircle className="h-5 w-5 text-accent" />
                        <span>Cryptographic verification</span>
                      </div>
                      <div className="flex items-center space-x-3" data-testid="pdp-feature-2">
                        <CheckCircle className="h-5 w-5 text-accent" />
                        <span>Immutable content history</span>
                      </div>
                      <div className="flex items-center space-x-3" data-testid="pdp-feature-3">
                        <CheckCircle className="h-5 w-5 text-accent" />
                        <span>Real-time integrity checks</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <img 
                      src="https://images.unsplash.com/photo-1518186285589-2f7649de83e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400" 
                      alt="Blockchain verification and security technology" 
                      className="rounded-lg shadow-lg w-full"
                      data-testid="pdp-illustration"
                    />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-16 bg-card">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4" data-testid="pricing-title">Flexible Pricing Options</h2>
              <p className="text-muted-foreground text-lg">
                Choose the plan that works best for you
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <Card className="bg-background rounded-xl p-8 border border-border" data-testid="pricing-free">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold mb-2">Free Viewer</h3>
                  <div className="text-3xl font-bold mb-1">$0</div>
                  <div className="text-muted-foreground">Forever</div>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-accent" />
                    <span>Watch free content</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-accent" />
                    <span>Pay-per-view videos</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-accent" />
                    <span>Content verification</span>
                  </li>
                </ul>
                <Button variant="secondary" className="w-full">
                  Get Started
                </Button>
              </Card>
              
              <Card className="bg-background rounded-xl p-8 border-2 border-primary relative" data-testid="pricing-pro">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </div>
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold mb-2">Creator Pro</h3>
                  <div className="text-3xl font-bold mb-1">$19</div>
                  <div className="text-muted-foreground">per month</div>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-accent" />
                    <span>Unlimited uploads</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-accent" />
                    <span>Advanced analytics</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-accent" />
                    <span>Custom branding</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-accent" />
                    <span>Priority support</span>
                  </li>
                </ul>
                <Button className="w-full bg-primary hover:bg-primary/90">
                  Start Creating
                </Button>
              </Card>
              
              <Card className="bg-background rounded-xl p-8 border border-border" data-testid="pricing-enterprise">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold mb-2">Enterprise</h3>
                  <div className="text-3xl font-bold mb-1">$99</div>
                  <div className="text-muted-foreground">per month</div>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-accent" />
                    <span>White-label solution</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-accent" />
                    <span>API access</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-accent" />
                    <span>Dedicated support</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-accent" />
                    <span>Custom integrations</span>
                  </li>
                </ul>
                <Button variant="secondary" className="w-full">
                  Contact Sales
                </Button>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
