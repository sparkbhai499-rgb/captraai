import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ReactNode, useRef } from "react";
import { cn } from "@/lib/utils";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
}

export const TiltCard = ({ children, className }: TiltCardProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 18 });
  const sy = useSpring(y, { stiffness: 200, damping: 18 });
  const rotateX = useTransform(sy, [-0.5, 0.5], ["8deg", "-8deg"]);
  const rotateY = useTransform(sx, [-0.5, 0.5], ["-8deg", "8deg"]);

  const handleMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d", transformPerspective: 1000 }}
      className={cn(
        "relative rounded-2xl border border-border bg-card transition-shadow duration-300 hover:shadow-[0_20px_50px_-12px_hsl(var(--primary)/0.35)]",
        className
      )}
    >
      <div style={{ transform: "translateZ(30px)" }} className="relative h-full">
        {children}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity"
        style={{
          background:
            "radial-gradient(600px circle at var(--mx,50%) var(--my,50%), hsl(var(--primary)/0.12), transparent 40%)",
        }}
      />
    </motion.div>
  );
};
