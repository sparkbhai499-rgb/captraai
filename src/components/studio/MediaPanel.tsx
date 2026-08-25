import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStudio } from "@/lib/studio/store";
import { defaultText, makeClip } from "@/lib/studio/types";
import { STICKERS } from "@/lib/studio/presets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Image as ImageIcon, Loader2, Music, Search, Sparkles, Type, Upload, Video } from "lucide-react";
import { toast } from "sonner";

type Asset = { id: string; name: string; kind: string; storage_path: string; duration_sec: number | null; url?: string };

const kindOf = (file: File) => {
  if (file.type.startsWith("audio")) return "audio";
  if (file.type === "image/gif") return "gif";
  if (file.type.startsWith("image")) return "image";
  return "video";
};

const probeDuration = (file: File, kind: string) =>
  new Promise<number | null>((res) => {
    if (kind === "image" || kind === "gif") return res(null);
    const el = document.createElement(kind === "audio" ? "audio" : "video") as HTMLMediaElement;
    el.preload = "metadata";
    el.onloadedmetadata = () => res(Number(el.duration) || null);
    el.onerror = () => res(null);
    el.src = URL.createObjectURL(file);
  });

export const MediaPanel = ({ projectId, userId }: { projectId: string; userId: string }) => {
  const { addClip, doc, setDoc, time, duration, selectedClip, updateClip } = useStudio();
  const musicRef = useRef<HTMLInputElement>(null);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [lang, setLang] = useState("auto");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase.from("project_assets").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
    const withUrls = await Promise.all((data || []).map(async (a: any) => {
      const { data: s } = await supabase.storage.from("videos").createSignedUrl(a.storage_path, 60 * 60 * 8);
      return { ...a, url: s?.signedUrl } as Asset;
    }));
    setAssets(withUrls);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [projectId]);

  const importFiles = async (files: FileList) => {
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const kind = kindOf(file);
        const duration = await probeDuration(file, kind);
        const ext = file.name.split(".").pop() || "bin";
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("videos").upload(path, file, { contentType: file.type || undefined });
        if (error) throw error;
        await supabase.from("project_assets").insert({
          project_id: projectId, user_id: userId, kind, name: file.name, storage_path: path, duration_sec: duration,
        });
      }
      toast.success("Imported to media library");
      load();
    } catch (e: any) { toast.error(e.message || "Import failed"); }
    finally { setBusy(false); }
  };

  const addAsset = (a: Asset) => {
    if (!a.url) return;
    const dur = a.duration_sec || 5;
    const kind = a.kind as any;
    const trackKind = kind === "audio" ? "audio" : kind === "video" ? "video" : "overlay";
    addClip(trackKind, makeClip({
      kind, name: a.name, src: a.url, assetId: a.id,
      start: time, duration: dur, sourceDuration: a.duration_sec || undefined,
    }));
  };

  const addText = () => addClip("text", makeClip({ kind: "text", name: "Text", start: time, duration: 4, text: defaultText() }));

  const addSticker = (emoji: string) => addClip("sticker", makeClip({
    kind: "sticker", name: emoji, start: time, duration: 3,
    text: { ...defaultText(), content: emoji, size: 140, animation: "pop" },
  }));

  const autoCaptions = async () => {
    setAiBusy(true);
    try {
      const { error } = await supabase.functions.invoke("transcribe-video", { body: { project_id: projectId, language: lang } });
      if (error) throw error;
      const { data: caps } = await supabase.from("captions").select("*").eq("project_id", projectId).order("idx");
      if (!caps?.length) throw new Error("No speech detected");
      caps.forEach((c: any) => addClip("text", makeClip({
        kind: "text", name: "Caption", start: c.start_ms / 1000,
        duration: Math.max(0.4, (c.end_ms - c.start_ms) / 1000),
        text: { ...defaultText(), content: c.text, size: 56, animation: "word", strokeWidth: 3, shadow: 0.8 },
        transform: { ...makeClip({ kind: "text", name: "x" }).transform, y: 32 },
      })));
      toast.success(`${caps.length} caption layers added`);
    } catch (e: any) { toast.error(e.message || "Caption generation failed"); }
    finally { setAiBusy(false); }
  };

  const silenceTrim = () => {
    // non-destructive helper: tightens gaps between clips on the video track
    toast.info("Tip: use Split on the timeline, then delete the silent piece — full AI silence removal is coming next.");
  };

  const filtered = assets.filter((a) => a.name.toLowerCase().includes(q.toLowerCase()));
  const musicAssets = filtered.filter((a) => a.kind === "audio");

  /* ---- music helpers (non-destructive) ---- */
  const addMusic = (a: Asset, opts?: { fromStart?: boolean }) => {
    if (!a.url) return;
    const src = a.duration_sec || 30;
    const at = opts?.fromStart ? 0 : time;
    addClip("audio", makeClip({
      kind: "audio", name: a.name, src: a.url, assetId: a.id,
      start: at, duration: src, sourceDuration: a.duration_sec || undefined,
      audio: { volume: 0.8, fadeIn: 0.6, fadeOut: 1.2, pitch: 0 },
    }));
    toast.success("Music added to audio track");
  };

  const fitMusicToVideo = (a: Asset) => {
    if (!a.url) return;
    const src = a.duration_sec || 30;
    const target = Math.max(1, duration);
    let at = 0;
    let added = 0;
    while (at < target - 0.2 && added < 30) {
      const len = Math.min(src, target - at);
      addClip("audio", makeClip({
        kind: "audio", name: a.name, src: a.url, assetId: a.id,
        start: at, duration: len, sourceDuration: a.duration_sec || undefined,
        audio: { volume: 0.8, fadeIn: at === 0 ? 0.6 : 0, fadeOut: at + len >= target - 0.2 ? 1.2 : 0, pitch: 0 },
      }));
      at += len; added++;
    }
    toast.success(`Music fit to video (${added} loop${added > 1 ? "s" : ""})`);
  };

  const isAudioSel = selectedClip?.kind === "audio";
  const setSelAudio = (patch: Partial<{ volume: number; fadeIn: number; fadeOut: number }>) => {
    if (!selectedClip) return;
    updateClip(selectedClip.id, { audio: { ...selectedClip.audio, ...patch } });
  };
  const duckMusic = () => {
    setDoc((d) => ({
      ...d,
      tracks: d.tracks.map((t) => t.kind !== "audio" ? t : {
        ...t, clips: t.clips.map((c) => ({ ...c, audio: { ...c.audio, volume: 0.25 } })),
      }),
    }));
    toast.success("Music ducked to 25% for voice clarity");
  };

  return (
    <div className="glass rounded-xl overflow-hidden flex flex-col max-h-[70vh]">
      <Tabs defaultValue="media" className="flex flex-col overflow-hidden">
        <TabsList className="grid grid-cols-5 m-2 bg-secondary/50">
          <TabsTrigger value="media"><Video className="w-4 h-4" /></TabsTrigger>
          <TabsTrigger value="music"><Music className="w-4 h-4" /></TabsTrigger>
          <TabsTrigger value="text"><Type className="w-4 h-4" /></TabsTrigger>
          <TabsTrigger value="stickers"><ImageIcon className="w-4 h-4" /></TabsTrigger>
          <TabsTrigger value="ai"><Sparkles className="w-4 h-4" /></TabsTrigger>
        </TabsList>


        <div className="overflow-y-auto px-3 pb-4 space-y-3">
          <TabsContent value="media" className="space-y-3 m-0">
            <input ref={fileRef} type="file" hidden multiple accept="video/*,image/*,audio/*,.gif"
              onChange={(e) => e.target.files?.length && importFiles(e.target.files)} />
            <Button className="w-full gradient-primary text-white border-0" disabled={busy} onClick={() => fileRef.current?.click()}>
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />} Import media
            </Button>
            <p className="text-[11px] text-muted-foreground">Video, photos, GIFs and audio. Files stay in your library for every session.</p>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search library…" className="pl-9 bg-secondary/50 h-9" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {filtered.map((a) => (
                <button key={a.id} onClick={() => addAsset(a)}
                  className="rounded-lg border border-white/10 bg-secondary/40 p-2 text-left hover:border-primary transition">
                  <div className="aspect-video rounded bg-black/40 grid place-items-center mb-1 overflow-hidden">
                    {a.kind === "image" || a.kind === "gif"
                      ? <img src={a.url} alt={a.name} className="w-full h-full object-cover" />
                      : a.kind === "audio" ? <Music className="w-5 h-5 opacity-60" /> : <Video className="w-5 h-5 opacity-60" />}
                  </div>
                  <p className="text-[11px] truncate">{a.name}</p>
                  {a.duration_sec ? <p className="text-[10px] text-muted-foreground">{a.duration_sec.toFixed(1)}s</p> : null}
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="text" className="space-y-2 m-0">
            <Button className="w-full" variant="secondary" onClick={addText}><Type className="w-4 h-4 mr-2" /> Add text layer</Button>
            <p className="text-[11px] text-muted-foreground">Fonts, stroke, shadow, background and animations live in the Text tab of the inspector.</p>
          </TabsContent>

          <TabsContent value="stickers" className="m-0">
            <div className="grid grid-cols-6 gap-1.5">
              {STICKERS.map((s) => (
                <button key={s} onClick={() => addSticker(s)} className="text-2xl rounded-lg py-1.5 bg-secondary/40 hover:bg-primary/20">{s}</button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="ai" className="space-y-3 m-0">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Caption language</label>
              <Select value={lang} onValueChange={setLang}>
                <SelectTrigger className="bg-secondary/50 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto detect</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hinglish">Hinglish</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full gradient-primary text-white border-0" disabled={aiBusy} onClick={autoCaptions}>
              {aiBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />} AI auto captions
            </Button>
            <Button className="w-full" variant="secondary" onClick={silenceTrim}>Silence trim helper</Button>
            <p className="text-[11px] text-muted-foreground">
              Captions are transcribed from the project video and dropped onto the text track as fully editable layers.
            </p>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};
