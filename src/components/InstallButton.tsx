import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Check } from "lucide-react";
import { toast } from "sonner";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export const InstallButton = ({ variant = "outline" }: { variant?: "outline" | "default" | "ghost" }) => {
  const [prompt, setPrompt] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
    if (standalone) setInstalled(true);
    const ua = window.navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e as BIPEvent); };
    const onInstalled = () => { setInstalled(true); setPrompt(null); toast.success("Captra AI installed!"); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) {
    return (
      <Button variant="ghost" size="sm" className="gap-2 text-xs" disabled>
        <Check className="w-3.5 h-3.5"/> Installed
      </Button>
    );
  }

  const onClick = async () => {
    if (prompt) {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") toast.success("Installing…");
      setPrompt(null);
      return;
    }
    if (isIOS) {
      toast("On iPhone: tap Share → Add to Home Screen", { duration: 5000 });
      return;
    }
    toast("Open in Chrome/Edge and use browser menu → Install app", { duration: 5000 });
  };

  return (
    <Button onClick={onClick} variant={variant} size="sm" className="gap-2 text-xs gradient-primary text-primary-foreground border-0 glow">
      <Download className="w-3.5 h-3.5"/> Install App
    </Button>
  );
};
