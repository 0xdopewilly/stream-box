import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="bg-card border-t border-border py-16" data-testid="footer">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <i className="fas fa-play text-primary-foreground text-sm"></i>
              </div>
              <span className="text-xl font-bold">StreamBox</span>
            </div>
            <p className="text-muted-foreground mb-4">
              The decentralized video platform empowering creators with tamper-proof storage and direct monetization.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="social-twitter">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="social-discord">
                <i className="fab fa-discord"></i>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="social-github">
                <i className="fab fa-github"></i>
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Platform</h4>
            <ul className="space-y-3 text-muted-foreground">
              <li><Link href="/about" className="hover:text-foreground transition-colors" data-testid="footer-how-it-works">How it Works</Link></li>
              <li><a href="#pricing" className="hover:text-foreground transition-colors" data-testid="footer-pricing">Pricing</a></li>
              <li><Link href="/creators" className="hover:text-foreground transition-colors" data-testid="footer-creator-resources">Creator Resources</Link></li>
              <li><a href="https://docs.streambox.com" className="hover:text-foreground transition-colors" data-testid="footer-api-docs">API Documentation</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Technology</h4>
            <ul className="space-y-3 text-muted-foreground">
              <li><a href="https://filecoin.io/storage" className="hover:text-foreground transition-colors" data-testid="footer-filecoin-storage">Filecoin Storage</a></li>
              <li><a href="#verification" className="hover:text-foreground transition-colors" data-testid="footer-content-verification">Content Verification</a></li>
              <li><a href="https://docs.filcdn.network" className="hover:text-foreground transition-colors" data-testid="footer-filcdn">FilCDN</a></li>
              <li><a href="#security" className="hover:text-foreground transition-colors" data-testid="footer-security">Security</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-3 text-muted-foreground">
              <li><a href="https://help.streambox.com" className="hover:text-foreground transition-colors" data-testid="footer-help-center">Help Center</a></li>
              <li><a href="mailto:support@streambox.com" className="hover:text-foreground transition-colors" data-testid="footer-contact-us">Contact Us</a></li>
              <li><a href="https://discord.gg/streambox" className="hover:text-foreground transition-colors" data-testid="footer-community">Community</a></li>
              <li><a href="https://github.com/streambox/issues" className="hover:text-foreground transition-colors" data-testid="footer-bug-reports">Bug Reports</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-muted-foreground text-sm">
            © 2024 StreamBox. All rights reserved.
          </div>
          <div className="flex space-x-6 text-sm text-muted-foreground mt-4 md:mt-0">
            <a href="/privacy" className="hover:text-foreground transition-colors" data-testid="footer-privacy">Privacy Policy</a>
            <a href="/terms" className="hover:text-foreground transition-colors" data-testid="footer-terms">Terms of Service</a>
            <a href="/cookies" className="hover:text-foreground transition-colors" data-testid="footer-cookies">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
