import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Download, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import logo from "@/assets/captra-logo.png";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const InstallAnimation = ({ done }: { done: boolean }) =>
  createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] grid place-items-center bg-background/80 backdrop-blur-xl"
    >
      <div className="relative flex flex-col items-center">
        <motion.div
          className="absolute w-56 h-56 rounded-full bg-primary/25 blur-3xl"
          animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.75, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute w-32 h-32 rounded-3xl border border-primary/40"
            initial={{ scale: 0.7, opacity: 0.7 }}
            animate={{ scale: 2.1, opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.55, ease: "easeOut" }}
          />
        ))}
        <motion.img
          src={logo}
          alt="Captra AI app icon"
          width={128}
          height={128}
          className="relative w-32 h-32 rounded-3xl"
          initial={{ scale: 0.6, y: 20, rotate: -8, opacity: 0 }}
          animate={done ? { scale: 1.05, y: 0, rotate: 0, opacity: 1 } : { scale: 1, y: [0, -10, 0], rotate: 0, opacity: 1 }}
          transition={done ? { type: "spring", stiffness: 220, damping: 12 } : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.p
          key={String(done)}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mt-8 font-display text-xl font-semibold"
        >
          {done ? "Captra AI installed 🎉" : "Installing Captra AI…"}
        </motion.p>
        <div className="relative mt-4 h-1 w-48 overflow-hidden rounded-full bg-secondary">
          <motion.div
            className="h-full gradient-primary"
            initial={{ width: "10%" }}
            animate={{ width: done ? "100%" : ["10%", "80%"] }}
            transition={{ duration: done ? 0.4 : 2.2, ease: "easeInOut" }}
          />
        </div>
      </div>
    </motion.div>,
    document.body
  );

export const InstallButton = ({ variant = "outline" }: { variant?: "outline" | "default" | "ghost" }) => {
  const [prompt, setPrompt] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [phase, setPhase] = useState<"idle" | "installing" | "done">("idle");

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
    if (standalone) setInstalled(true);
    const ua = window.navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e as BIPEvent); };
    const onInstalled = () => {
      setPrompt(null);
      setPhase("done");
      setTimeout(() => { setPhase("idle"); setInstalled(true); }, 1800);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const finish = (ok: boolean, message: string) => {
    setPhase(ok ? "done" : "idle");
    setTimeout(() => {
      setPhase("idle");
      ok ? toast.success(message) : toast(message, { duration: 5000 });
    }, ok ? 1600 : 0);
  };

  const onClick = async () => {
    setPhase("installing");
    if (prompt) {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      setPrompt(null);
      if (outcome === "accepted") { setPhase("done"); setTimeout(() => { setPhase("idle"); setInstalled(true); }, 1800); }
      else finish(false, "Install cancelled — you can try again anytime");
      return;
    }
    setTimeout(() => {
      finish(false, isIOS ? "On iPhone: tap Share → Add to Home Screen" : "Open in Chrome/Edge → menu → Install app");
    }, 1200);
  };

  return (
    <>
      <AnimatePresence>{phase !== "idle" && <InstallAnimation done={phase === "done"} />}</AnimatePresence>
      {installed ? (
        <Button variant="ghost" size="sm" className="gap-2 text-xs" disabled>
          <Check className="w-3.5 h-3.5" /> Installed
        </Button>
      ) : (
        <Button
          onClick={onClick}
          variant={variant}
          size="sm"
          className="gap-2 text-xs gradient-primary text-primary-foreground border-0 glow hover-scale"
        >
          <img src={logo} alt="" aria-hidden width={16} height={16} className="w-4 h-4 rounded" />
          <Download className="w-3.5 h-3.5" /> Install App
        </Button>
      )}
    </>
  );
};
