import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Phone, MessageCircle, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage = ({ onLogin }: LoginPageProps) => {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOTP = async () => {
    if (!phone.trim()) return;
    setLoading(true);
    setError("");

    const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;

    const { error: err } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    });

    if (err) {
      setError(err.message);
    } else {
      setStep("otp");
    }
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) return;
    setLoading(true);
    setError("");

    const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;

    const { error: err } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: otp,
      type: "sms",
    });

    if (err) {
      setError(err.message);
    } else {
      onLogin();
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
          {step === "phone" ? (
            <>
              <h2 className="text-lg font-semibold text-foreground mb-1">
                Phone Number Enter Karo
              </h2>
              <p className="text-xs text-muted-foreground mb-4">
                Hum aapko ek OTP bhejenge verification ke liye
              </p>

              <div className="relative mb-4">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="tel"
                  placeholder="+91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary text-secondary-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {error && (
                <p className="text-xs text-destructive mb-3">{error}</p>
              )}

              <Button
                onClick={handleSendOTP}
                disabled={loading || !phone.trim()}
                className="w-full rounded-xl h-11"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    OTP Bhejo <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-foreground mb-1">
                OTP Enter Karo
              </h2>
              <p className="text-xs text-muted-foreground mb-4">
                {phone} par bheja gaya 6-digit code daalo
              </p>

              <input
                type="text"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => e.key === "Enter" && handleVerifyOTP()}
                className="w-full text-center tracking-[0.5em] px-4 py-3 rounded-xl bg-secondary text-secondary-foreground placeholder:text-muted-foreground text-lg font-mono focus:outline-none focus:ring-2 focus:ring-ring mb-4"
                maxLength={6}
              />

              {error && (
                <p className="text-xs text-destructive mb-3">{error}</p>
              )}

              <Button
                onClick={handleVerifyOTP}
                disabled={loading || otp.length < 6}
                className="w-full rounded-xl h-11 mb-3"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Verify Karo"
                )}
              </Button>

              <button
                onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Phone number badlo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
