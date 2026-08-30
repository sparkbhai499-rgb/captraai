import { CAPTION_TEMPLATES, CaptionTemplate } from "@/lib/studio/captionTemplates";
import { TextCfg } from "@/lib/studio/types";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

const previewStyle = (t: Partial<TextCfg>): React.CSSProperties => ({
  fontFamily: t.font,
  fontWeight: t.weight,
  color: t.color,
  WebkitTextStroke: t.strokeWidth ? `${Math.min(3, (t.strokeWidth || 0) / 3)}px ${t.stroke}` : undefined,
  paintOrder: "stroke fill" as any,
  textShadow: t.glow ? `0 0 8px ${t.highlight}, 0 0 18px ${t.highlight}` : "0 2px 6px rgba(0,0,0,.7)",
  textTransform: t.uppercase ? "uppercase" : "none",
  lineHeight: 1.15,
});

export const CaptionTemplates = ({ current, onPick }: { current?: string; onPick: (tpl: CaptionTemplate) => void }) => (
  <div className="grid grid-cols-3 gap-2">
    {CAPTION_TEMPLATES.map((tpl, i) => {
      const words = tpl.sample.split(" ");
      const active = current === tpl.id;
      return (
        <motion.button
          key={tpl.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.025, duration: 0.25, ease: "easeOut" }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onPick(tpl)}
          title={tpl.label}
          className={`relative aspect-[4/3] rounded-lg border overflow-hidden grid place-items-center p-1.5 text-[10px] bg-black/60 transition-colors ${
            active ? "border-primary ring-1 ring-primary/60" : "border-white/10 hover:border-primary/60"
          }`}
        >
          <span style={previewStyle(tpl.cfg)} className="leading-tight text-center break-words">
            {words.map((w, wi) => (
              <span
                key={wi}
                style={
                  wi === 1 || words.length === 1
                    ? {
                        color: tpl.cfg.highlight,
                        background: tpl.cfg.highlightBg !== "transparent" ? tpl.cfg.highlightBg : undefined,
                        borderRadius: 3,
                        padding: tpl.cfg.highlightBg !== "transparent" ? "0 2px" : undefined,
                      }
                    : undefined
                }
              >
                {w}{" "}
              </span>
            ))}
          </span>
          {active && (
            <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary grid place-items-center">
              <Check className="w-2.5 h-2.5 text-primary-foreground" />
            </span>
          )}
          <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] text-muted-foreground py-0.5">{tpl.label}</span>
        </motion.button>
      );
    })}
  </div>
);
