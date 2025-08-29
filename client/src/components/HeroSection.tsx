import { Play, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function HeroSection() {
  return (
    <section className="relative h-[70vh] overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(15, 15, 15, 0.8), rgba(15, 15, 15, 0.3)), url('https://images.unsplash.com/photo-1626544424081-4b3c879c5c6e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080')`
        }}
      />
      
      <div className="relative z-10 container mx-auto px-4 h-full flex items-center">
        <div className="max-w-2xl">
          <div className="mb-4">
            <Badge className="bg-primary text-primary-foreground" data-testid="featured-badge">
              Featured Creator
            </Badge>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4 leading-tight" data-testid="hero-title">
            The Future of<br/>
            <span className="text-primary">Decentralized</span><br/>
            Streaming
          </h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed" data-testid="hero-subtitle">
            Upload, stream, and monetize your content on a tamper-proof, creator-owned platform powered by Filecoin.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg font-semibold"
              data-testid="start-creating-button"
            >
              <Play className="h-5 w-5 mr-2" />
              Start Creating
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="px-8 py-4 text-lg font-semibold"
              data-testid="how-it-works-button"
            >
              <Info className="h-5 w-5 mr-2" />
              How It Works
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
