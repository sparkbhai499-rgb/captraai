import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Lock, MessageCircle, ArrowRight, Loader2, User, Phone, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage = ({ onLogin }: LoginPageProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSignUp, _setIsSignUp] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async () => {
    if (!email.trim()) return;
    if (!isForgot && !password.trim()) return;
    if (isSignUp && (!phone.trim() || !displayName.trim())) {
      setError("Naam aur phone number dono zaruri hai!");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");

    if (isForgot) {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err) setError(err.message);
      else setSuccess("Password reset link aapke email pe bhej diya gaya hai!");
      setLoading(false);
      return;
    }

    if (isSignUp) {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", phone.trim())
        .maybeSingle();

      if (existingProfile) {
        setError("Ye phone number pehle se kisi account mein registered hai!");
        setLoading(false);
        return;
      }

      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName.trim(),
            phone: phone.trim(),
          },
        },
      });
      if (err) setError(err.message);
      else setSuccess("Signup ho gaya! Email verify karo aur phir login karo.");
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) setError(err.message);
      else onLogin();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <MessageCircle className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">W8sap</h1>
          <p className="text-sm text-muted-foreground mt-1">Apne doston se connect karo</p>
        </div>

        <div className="bg-card rounded-2xl p-6 shadow-lg border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-1">
            {isForgot ? "Password Reset" : isSignUp ? "Account Banao" : "Login Karo"}
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            {isForgot
              ? "Apna email daalo, reset link bhej denge"
              : isSignUp
              ? "Naya account create karo"
              : "Apne account mein login karo"}
          </p>

          {isSignUp && !isForgot && (
            <>
              <div className="relative mb-3">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Apna naam likho"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary text-secondary-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="relative mb-3">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="tel"
                  placeholder="+91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary text-secondary-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </>
          )}

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

          {!isForgot && (
            <div className="relative mb-2">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="w-full pl-10 pr-12 py-3 rounded-xl bg-secondary text-secondary-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          )}

          {!isSignUp && !isForgot && (
            <button
              onClick={() => { setIsForgot(true); setError(""); setSuccess(""); }}
              className="text-xs text-primary hover:underline mb-3 block text-right"
            >
              Password bhool gaye?
            </button>
          )}

          {error && <p className="text-xs text-destructive mb-3">{error}</p>}
          {success && <p className="text-xs text-green-600 mb-3">{success}</p>}

          <Button
            onClick={handleSubmit}
            disabled={loading || !email.trim() || (!isForgot && !password.trim()) || (isSignUp && (!phone.trim() || !displayName.trim()))}
            className="w-full rounded-xl h-11 mb-3"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {isForgot ? "Reset Link Bhejo" : isSignUp ? "Sign Up" : "Login"}{" "}
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>

          {/* Signup disabled — only existing users can login */}

          {isForgot && (
            <button
              onClick={() => { setIsForgot(false); setError(""); setSuccess(""); }}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors mt-2"
            >
              ← Wapas login pe jaao
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
