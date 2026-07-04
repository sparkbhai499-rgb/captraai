import { Link } from "react-router-dom";
import { Sparkles, Twitter, Youtube, Github } from "lucide-react";

export const Footer = () => (
  <footer className="border-t border-border mt-32">
    <div className="container py-14 grid grid-cols-2 md:grid-cols-4 gap-8">
      <div className="col-span-2">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          RXP <span className="gradient-text">Caption AI</span>
        </Link>
        <p className="text-sm text-muted-foreground mt-3 max-w-sm">
          Create professional AI captions in seconds. Multilingual, editable, exportable.
        </p>
        <div className="flex gap-3 mt-4">
          <a href="#" className="w-9 h-9 rounded-lg glass flex items-center justify-center hover:text-primary transition"><Twitter className="w-4 h-4"/></a>
          <a href="#" className="w-9 h-9 rounded-lg glass flex items-center justify-center hover:text-primary transition"><Youtube className="w-4 h-4"/></a>
          <a href="#" className="w-9 h-9 rounded-lg glass flex items-center justify-center hover:text-primary transition"><Github className="w-4 h-4"/></a>
        </div>
      </div>
      <div>
        <h4 className="font-display font-semibold mb-3 text-sm">Product</h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li><Link to="/dashboard" className="hover:text-foreground">Dashboard</Link></li>
          <li><Link to="/pricing" className="hover:text-foreground">Pricing</Link></li>
          <li><a href="/#features" className="hover:text-foreground">Features</a></li>
          <li><a href="/#faq" className="hover:text-foreground">FAQ</a></li>
        </ul>
      </div>
      <div>
        <h4 className="font-display font-semibold mb-3 text-sm">Company</h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
          <li><a href="#" className="hover:text-foreground">Privacy</a></li>
          <li><a href="#" className="hover:text-foreground">Terms</a></li>
        </ul>
      </div>
    </div>
    <div className="border-t border-border py-5">
      <div className="container flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} RXP Caption AI. All rights reserved.</p>
        <p>Built for creators worldwide.</p>
      </div>
    </div>
  </footer>
);
