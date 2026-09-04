import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const GlassCard = ({ className, children, ...props }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) => (
  <div {...props} className={cn("glass neon-card rounded-2xl p-6", className)}>{children}</div>
);
