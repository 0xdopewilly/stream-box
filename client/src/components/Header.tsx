import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, Menu, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WalletButton } from "@/components/WalletButton";
import { useWallet } from "@/hooks/useWallet";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  onSearch?: (query: string) => void;
}

export function Header({ onSearch }: HeaderProps) {
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isConnected } = useWallet();
  const { toast } = useToast();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  const navItems = [
    { path: "/", label: "Home" },
    { path: "/discover", label: "Discover" },
    { path: "/creators", label: "Creators" },
    { path: "/upload", label: "Upload" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center space-x-2" data-testid="logo-link">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <i className="fas fa-play text-primary-foreground text-sm"></i>
              </div>
              <span className="text-xl font-bold text-foreground">StreamBox</span>
            </div>
          </Link>
          
          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`transition-colors ${
                  location === item.path
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Search Bar */}
          <div className="hidden md:flex items-center">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Input
                type="search"
                placeholder="Search videos..."
                className="w-64 pr-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="search-input"
              />
              <Button
                type="submit"
                size="sm"
                variant="ghost"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                data-testid="search-button"
              >
                <Search className="h-4 w-4" />
              </Button>
            </form>
          </div>
          
          {/* Wallet Connection */}
          <WalletButton />
          
          {/* User Menu */}
          <Button
            variant="ghost"
            size="sm"
            className="w-8 h-8 bg-secondary rounded-full hover:bg-muted transition-colors p-0"
            onClick={() => {
              if (!isConnected) {
                toast({
                  title: "Wallet Required",
                  description: "Please connect your wallet to view your profile.",
                  variant: "destructive",
                });
              } else {
                // Navigate to profile page
                window.location.href = '/profile';
              }
            }}
            data-testid="user-menu"
          >
            <User className="h-4 w-4" />
          </Button>
          
          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            data-testid="mobile-menu-toggle"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-card border-t border-border">
          <div className="container mx-auto px-4 py-4 space-y-4">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Input
                type="search"
                placeholder="Search videos..."
                className="w-full pr-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="mobile-search-input"
              />
              <Button
                type="submit"
                size="sm"
                variant="ghost"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                data-testid="mobile-search-button"
              >
                <Search className="h-4 w-4" />
              </Button>
            </form>
            <nav className="flex flex-col space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`block py-2 transition-colors ${
                    location === item.path
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  data-testid={`mobile-nav-${item.label.toLowerCase()}`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
