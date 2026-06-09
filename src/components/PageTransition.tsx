import { motion } from "framer-motion";
import { ReactNode } from "react";
import { useLocation } from "react-router-dom";

export const PageTransition = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
};
