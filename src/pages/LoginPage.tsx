import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Lock, MessageCircle, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage = ({ onLogin }: LoginPageProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError("");
    setSuccess("");

    if (isSignUp) {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
      });
      if (err) {
        setError(err.message);
      } else {
        setSuccess("Signup ho gaya! Email verify karo aur phir login karo.");
      }
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (err) {
        setError(err.message);
      } else {
        onLogin();
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <MessageCircle className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Message Hub</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Apne doston se connect karo
          </p>
        </div>

        <div className="bg-card rounded-2xl p-6 shadow-lg border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-1">
            {isSignUp ? "Account Banao" : "Login Karo"}
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            {isSignUp ? "Naya account create karo" : "Apne account mein login karo"}
          </p>

          <div className="relative mb-3">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary text-secondary-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="relative mb-4">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary text-secondary-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && <p className="text-xs text-destructive mb-3">{error}</p>}
          {success && <p className="text-xs text-green-600 mb-3">{success}</p>}

          <Button
            onClick={handleSubmit}
            disabled={loading || !email.trim() || !password.trim()}
            className="w-full rounded-xl h-11 mb-3"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {isSignUp ? "Sign Up" : "Login"} <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>

          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(""); setSuccess(""); }}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isSignUp ? "← Pehle se account hai? Login karo" : "Naya account banao →"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
