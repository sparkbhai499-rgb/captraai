import { useStudio } from "@/lib/studio/store";
import { Clip, KfProp, uid } from "@/lib/studio/types";
import { BLEND_MODES, EFFECTS, FILTERS, FONTS, SPEEDS, TRANSITIONS } from "@/lib/studio/presets";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Diamond, FlipHorizontal, FlipVertical, Plus, Snowflake, Trash2, Undo2 } from "lucide-react";

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    {children}
  </div>
);

const NumSlider = ({ label, value, min, max, step = 1, onChange, suffix }:
  { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; suffix?: string }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{Number(value.toFixed(2))}{suffix}</span>
    </div>
    <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
  </div>
);

export const Inspector = () => {
  const { selectedClip: clip, updateClip, time, doc, setDoc } = useStudio();

  if (!clip) {
    return (
      <div className="glass rounded-xl p-4 text-sm text-muted-foreground">
        <p className="font-display text-base text-foreground mb-1">Nothing selected</p>
        Pick a clip on the timeline to edit transform, filters, effects, masks, keyframes and audio.
        <div className="mt-4 space-y-2">
          <Row label="Canvas size">
            <Select value={`${doc.width}x${doc.height}`} onValueChange={(v) => {
              const [w, h] = v.split("x").map(Number);
              setDoc((d) => ({ ...d, width: w, height: h }));
            }}>
              <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1920x1080">16:9 Landscape</SelectItem>
                <SelectItem value="1080x1920">9:16 Reels / Shorts</SelectItem>
                <SelectItem value="1080x1080">1:1 Square</SelectItem>
                <SelectItem value="1080x1350">4:5 Portrait</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row label="Frame rate">
            <Select value={String(doc.fps)} onValueChange={(v) => setDoc((d) => ({ ...d, fps: Number(v) }))}>
              <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
              <SelectContent>{[24, 30, 60].map((f) => <SelectItem key={f} value={String(f)}>{f} fps</SelectItem>)}</SelectContent>
            </Select>
          </Row>
        </div>
      </div>
    );
  }

  const local = Math.max(0, time - clip.start);
  const up = (p: Partial<Clip>) => updateClip(clip.id, p);
  const upT = (p: Partial<Clip["transform"]>) => up({ transform: { ...clip.transform, ...p } });
  const upA = (p: Partial<Clip["adjust"]>) => up({ adjust: { ...clip.adjust, ...p } });

  const addKf = (name: KfProp, v: number) => {
    const cur = clip.keyframes[name] || [];
    up({ keyframes: { ...clip.keyframes, [name]: [...cur.filter((k) => Math.abs(k.t - local) > 0.03), { t: local, v }] } });
  };
  const clearKf = (name: KfProp) => {
    const { [name]: _, ...rest } = clip.keyframes;
    up({ keyframes: rest });
  };
  const KfBtn = ({ name, v }: { name: KfProp; v: number }) => (
    <div className="flex gap-1">
      <Button size="sm" variant="secondary" className="h-7 px-2" onClick={() => addKf(name, v)}>
        <Diamond className="w-3 h-3 mr-1" /> Key {name} ({(clip.keyframes[name] || []).length})
      </Button>
      {(clip.keyframes[name]?.length || 0) > 0 && (
        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => clearKf(name)}><Undo2 className="w-3 h-3" /></Button>
      )}
    </div>
  );

  return (
    <div className="glass rounded-xl overflow-hidden flex flex-col max-h-[70vh]">
      <div className="px-3 py-2 border-b border-white/5 text-sm font-medium truncate">{clip.name}</div>
      <Tabs defaultValue="transform" className="flex-1 overflow-hidden flex flex-col">
        <TabsList className="grid grid-cols-3 m-2 bg-secondary/50">
          <TabsTrigger value="transform">Layout</TabsTrigger>
          <TabsTrigger value="look">Look</TabsTrigger>
          <TabsTrigger value="fx">FX</TabsTrigger>
        </TabsList>
        <TabsList className="grid grid-cols-3 mx-2 mb-2 bg-secondary/50">
          <TabsTrigger value="text">Text</TabsTrigger>
          <TabsTrigger value="mask">Mask</TabsTrigger>
          <TabsTrigger value="audio">Audio</TabsTrigger>
        </TabsList>

        <div className="overflow-y-auto px-3 pb-4 space-y-4">
          <TabsContent value="transform" className="space-y-4 m-0">
            <NumSlider label="Position X" value={clip.transform.x} min={-100} max={100} step={0.5} onChange={(v) => upT({ x: v })} suffix="%" />
            <KfBtn name="x" v={clip.transform.x} />
            <NumSlider label="Position Y" value={clip.transform.y} min={-100} max={100} step={0.5} onChange={(v) => upT({ y: v })} suffix="%" />
            <KfBtn name="y" v={clip.transform.y} />
            <NumSlider label="Scale" value={clip.transform.scale} min={0.05} max={5} step={0.01} onChange={(v) => upT({ scale: v })} />
            <KfBtn name="scale" v={clip.transform.scale} />
            <NumSlider label="Rotation" value={clip.transform.rotation} min={-180} max={180} onChange={(v) => upT({ rotation: v })} suffix="°" />
            <KfBtn name="rotation" v={clip.transform.rotation} />
            <NumSlider label="Opacity" value={clip.transform.opacity} min={0} max={1} step={0.01} onChange={(v) => upT({ opacity: v })} />
            <KfBtn name="opacity" v={clip.transform.opacity} />

            <div className="flex gap-2">
              <Button size="sm" variant={clip.transform.flipH ? "default" : "secondary"} onClick={() => upT({ flipH: !clip.transform.flipH })}><FlipHorizontal className="w-4 h-4" /></Button>
              <Button size="sm" variant={clip.transform.flipV ? "default" : "secondary"} onClick={() => upT({ flipV: !clip.transform.flipV })}><FlipVertical className="w-4 h-4" /></Button>
              <Button size="sm" variant={clip.freeze ? "default" : "secondary"} onClick={() => up({ freeze: !clip.freeze })}><Snowflake className="w-4 h-4 mr-1" />Freeze</Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <NumSlider label="Crop top" value={clip.transform.cropT} min={0} max={45} onChange={(v) => upT({ cropT: v })} suffix="%" />
              <NumSlider label="Crop bottom" value={clip.transform.cropB} min={0} max={45} onChange={(v) => upT({ cropB: v })} suffix="%" />
              <NumSlider label="Crop left" value={clip.transform.cropL} min={0} max={45} onChange={(v) => upT({ cropL: v })} suffix="%" />
              <NumSlider label="Crop right" value={clip.transform.cropR} min={0} max={45} onChange={(v) => upT({ cropR: v })} suffix="%" />
            </div>

            <Row label="Speed">
              <div className="flex flex-wrap gap-1">
                {SPEEDS.map((s) => (
                  <Button key={s} size="sm" variant={clip.speed === s ? "default" : "secondary"} className="h-7 px-2 text-xs"
                    onClick={() => up({ speed: s, duration: Math.max(0.2, (clip.duration * clip.speed) / s) })}>{s}x</Button>
                ))}
              </div>
            </Row>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Reverse playback</Label>
              <Switch checked={clip.reverse} onCheckedChange={(v) => up({ reverse: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Lock layer</Label>
              <Switch checked={clip.locked} onCheckedChange={(v) => up({ locked: v })} />
            </div>
            <Row label="Blend mode">
              <Select value={clip.blend} onValueChange={(v) => up({ blend: v })}>
                <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                <SelectContent>{BLEND_MODES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </Row>
            <Row label="Transition in">
              <div className="flex gap-2">
                <Select value={clip.transitionIn?.type || "none"} onValueChange={(v) => up({ transitionIn: { type: v, duration: clip.transitionIn?.duration || 0.5 } })}>
                  <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                  <SelectContent>{TRANSITIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" step={0.1} min={0.1} max={4} className="w-20 bg-secondary/50"
                  value={clip.transitionIn?.duration ?? 0.5}
                  onChange={(e) => up({ transitionIn: { type: clip.transitionIn?.type || "fade", duration: Number(e.target.value) } })} />
              </div>
            </Row>
          </TabsContent>

          <TabsContent value="look" className="space-y-4 m-0">
            <Row label="Filter">
              <div className="grid grid-cols-3 gap-1.5">
                {FILTERS.map((f) => (
                  <button key={f.id} onClick={() => up({ filter: f.id })}
                    className={`text-xs py-2 rounded-lg border ${clip.filter === f.id ? "border-primary bg-primary/15" : "border-white/10 bg-secondary/40"}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </Row>
            <NumSlider label="Filter intensity" value={clip.filterIntensity} min={0} max={2} step={0.05} onChange={(v) => up({ filterIntensity: v })} />
            {([
              ["brightness", "Brightness"], ["contrast", "Contrast"], ["saturation", "Saturation"],
              ["exposure", "Exposure"], ["highlights", "Highlights"], ["shadows", "Shadows"],
              ["temperature", "Temperature"], ["tint", "Tint"], ["sharpness", "Sharpness"],
              ["blur", "Blur"], ["grain", "Film grain"],
            ] as const).map(([k, label]) => (
              <NumSlider key={k} label={label} value={clip.adjust[k]} min={k === "blur" || k === "grain" || k === "sharpness" ? 0 : -100} max={100}
                onChange={(v) => upA({ [k]: v } as any)} />
            ))}
            <Button variant="secondary" size="sm" onClick={() => upA({
              brightness: 0, contrast: 0, saturation: 0, exposure: 0, highlights: 0, shadows: 0,
              temperature: 0, tint: 0, sharpness: 0, blur: 0, grain: 0,
            })}>Reset colour</Button>
          </TabsContent>

          <TabsContent value="fx" className="space-y-3 m-0">
            <div className="grid grid-cols-3 gap-1.5">
              {EFFECTS.map((e) => (
                <button key={e.id}
                  onClick={() => up({ effects: [...clip.effects, { id: uid(), type: e.id, intensity: 1, start: 0, duration: clip.duration }] })}
                  className="text-xs py-2 rounded-lg border border-white/10 bg-secondary/40 hover:border-primary">{e.label}</button>
              ))}
            </div>
            {clip.effects.length === 0 && <p className="text-xs text-muted-foreground">Tap an effect to add it to this clip.</p>}
            {clip.effects.map((e) => (
              <div key={e.id} className="rounded-lg border border-white/10 p-2 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{EFFECTS.find((x) => x.id === e.type)?.label}</span>
                  <Button size="sm" variant="ghost" className="h-6 px-2"
                    onClick={() => up({ effects: clip.effects.filter((x) => x.id !== e.id) })}><Trash2 className="w-3 h-3" /></Button>
                </div>
                <NumSlider label="Intensity" value={e.intensity} min={0} max={2} step={0.05}
                  onChange={(v) => up({ effects: clip.effects.map((x) => (x.id === e.id ? { ...x, intensity: v } : x)) })} />
                <NumSlider label="Start" value={e.start} min={0} max={Math.max(0.1, clip.duration)} step={0.1}
                  onChange={(v) => up({ effects: clip.effects.map((x) => (x.id === e.id ? { ...x, start: v } : x)) })} suffix="s" />
                <NumSlider label="Duration" value={e.duration} min={0.1} max={clip.duration} step={0.1}
                  onChange={(v) => up({ effects: clip.effects.map((x) => (x.id === e.id ? { ...x, duration: v } : x)) })} suffix="s" />
              </div>
            ))}
            <div className="rounded-lg border border-white/10 p-2 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Chroma key (green screen)</Label>
                <Switch checked={clip.chroma.enabled} onCheckedChange={(v) => up({ chroma: { ...clip.chroma, enabled: v } })} />
              </div>
              {clip.chroma.enabled && (
                <>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs flex-1">Key colour</Label>
                    <input type="color" value={clip.chroma.color} className="h-8 w-12 rounded bg-transparent"
                      onChange={(e) => up({ chroma: { ...clip.chroma, color: e.target.value } })} />
                  </div>
                  <NumSlider label="Threshold" value={clip.chroma.threshold} min={0} max={1} step={0.01} onChange={(v) => up({ chroma: { ...clip.chroma, threshold: v } })} />
                  <NumSlider label="Edge feather" value={clip.chroma.smooth} min={0} max={0.5} step={0.01} onChange={(v) => up({ chroma: { ...clip.chroma, smooth: v } })} />
                  <NumSlider label="Spill reduction" value={clip.chroma.spill} min={0} max={1} step={0.01} onChange={(v) => up({ chroma: { ...clip.chroma, spill: v } })} />
                  <NumSlider label="Shadow" value={clip.chroma.shadow} min={-1} max={1} step={0.01} onChange={(v) => up({ chroma: { ...clip.chroma, shadow: v } })} />
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="text" className="space-y-3 m-0">
            {!clip.text ? <p className="text-xs text-muted-foreground">This clip has no text. Add a text or sticker layer from the left rail.</p> : (
              <>
                <Row label="Content">
                  <Textarea value={clip.text.content} className="bg-secondary/50"
                    onChange={(e) => up({ text: { ...clip.text!, content: e.target.value } })} />
                </Row>
                <Row label="Font">
                  <Select value={clip.text.font} onValueChange={(v) => up({ text: { ...clip.text!, font: v } })}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                    <SelectContent>{FONTS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </Row>
                <NumSlider label="Size" value={clip.text.size} min={12} max={280} onChange={(v) => up({ text: { ...clip.text!, size: v } })} />
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2"><Label className="text-xs">Fill</Label>
                    <input type="color" value={clip.text.color} className="h-8 w-10 rounded bg-transparent" onChange={(e) => up({ text: { ...clip.text!, color: e.target.value } })} /></div>
                  <div className="flex items-center gap-2"><Label className="text-xs">Stroke</Label>
                    <input type="color" value={clip.text.stroke} className="h-8 w-10 rounded bg-transparent" onChange={(e) => up({ text: { ...clip.text!, stroke: e.target.value } })} /></div>
                </div>
                <NumSlider label="Stroke width" value={clip.text.strokeWidth} min={0} max={16} step={0.5} onChange={(v) => up({ text: { ...clip.text!, strokeWidth: v } })} />
                <NumSlider label="Shadow" value={clip.text.shadow} min={0} max={1} step={0.05} onChange={(v) => up({ text: { ...clip.text!, shadow: v } })} />
                <NumSlider label="Letter spacing" value={clip.text.letterSpacing} min={-5} max={30} onChange={(v) => up({ text: { ...clip.text!, letterSpacing: v } })} />
                <Row label="Animation">
                  <Select value={clip.text.animation} onValueChange={(v: any) => up({ text: { ...clip.text!, animation: v } })}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["none", "fade", "typewriter", "pop", "word", "slide"].map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Row>
                <Row label="Background">
                  <div className="flex gap-2">
                    <Button size="sm" variant={clip.text.bg === "transparent" ? "default" : "secondary"} onClick={() => up({ text: { ...clip.text!, bg: "transparent" } })}>None</Button>
                    <Button size="sm" variant={clip.text.bg !== "transparent" ? "default" : "secondary"} onClick={() => up({ text: { ...clip.text!, bg: "rgba(0,0,0,0.6)" } })}>Box</Button>
                  </div>
                </Row>
              </>
            )}
          </TabsContent>

          <TabsContent value="mask" className="space-y-3 m-0">
            <Row label="Mask shape">
              <div className="grid grid-cols-4 gap-1.5">
                {(["none", "circle", "rect", "linear"] as const).map((m) => (
                  <button key={m} onClick={() => up({ mask: { ...clip.mask, type: m } })}
                    className={`text-xs py-2 rounded-lg border ${clip.mask.type === m ? "border-primary bg-primary/15" : "border-white/10 bg-secondary/40"}`}>{m}</button>
                ))}
              </div>
            </Row>
            {clip.mask.type !== "none" && (
              <>
                <NumSlider label="Center X" value={clip.mask.x} min={0} max={100} onChange={(v) => up({ mask: { ...clip.mask, x: v } })} suffix="%" />
                <NumSlider label="Center Y" value={clip.mask.y} min={0} max={100} onChange={(v) => up({ mask: { ...clip.mask, y: v } })} suffix="%" />
                <NumSlider label="Width" value={clip.mask.w} min={5} max={150} onChange={(v) => up({ mask: { ...clip.mask, w: v } })} suffix="%" />
                <NumSlider label="Height" value={clip.mask.h} min={5} max={150} onChange={(v) => up({ mask: { ...clip.mask, h: v } })} suffix="%" />
                <NumSlider label="Feather" value={clip.mask.feather} min={0} max={50} onChange={(v) => up({ mask: { ...clip.mask, feather: v } })} />
                <NumSlider label="Angle" value={clip.mask.angle} min={0} max={360} onChange={(v) => up({ mask: { ...clip.mask, angle: v } })} suffix="°" />
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Invert mask</Label>
                  <Switch checked={clip.mask.invert} onCheckedChange={(v) => up({ mask: { ...clip.mask, invert: v } })} />
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="audio" className="space-y-3 m-0">
            <NumSlider label="Volume" value={clip.audio.volume} min={0} max={1} step={0.01} onChange={(v) => up({ audio: { ...clip.audio, volume: v } })} />
            <KfBtn name="volume" v={clip.audio.volume} />
            <NumSlider label="Fade in" value={clip.audio.fadeIn} min={0} max={5} step={0.1} onChange={(v) => up({ audio: { ...clip.audio, fadeIn: v } })} suffix="s" />
            <NumSlider label="Fade out" value={clip.audio.fadeOut} min={0} max={5} step={0.1} onChange={(v) => up({ audio: { ...clip.audio, fadeOut: v } })} suffix="s" />
            <NumSlider label="Pitch" value={clip.audio.pitch} min={-12} max={12} onChange={(v) => up({ audio: { ...clip.audio, pitch: v } })} suffix=" st" />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};
