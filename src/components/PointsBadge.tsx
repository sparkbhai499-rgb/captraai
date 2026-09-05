import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { usePoints } from "@/hooks/usePoints";

export const PointsBadge = ({ className = "" }: { className?: string }) => {
  const { points } = usePoints();
  if (!points) return null;
  return (
    <Link to="/dashboard" aria-label={`${points.balance} points`}>
      <motion.span
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold glass neon-card ${className}`}
      >
        <Sparkles className="w-3.5 h-3.5 text-accent" />
        <span className="gradient-text">{points.balance}</span>
        <span className="text-muted-foreground font-normal">pts</span>
      </motion.span>
    </Link>
  );
};
