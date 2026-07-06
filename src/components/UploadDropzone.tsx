import { useRef, useState, DragEvent } from "react";
import { UploadCloud, Loader2, Video, Languages } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALLOWED = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska"];
const MAX_MB = 200;

export const LANGS = [
  { value: "auto", label: "Auto detect" },
  { value: "hi", label: "Hindi (हिंदी)" },
  { value: "en", label: "English" },
  { value: "hinglish", label: "Hinglish (Hindi + English)" },
  { value: "multi", label: "Multilingual" },
];

export const UploadDropzone = ({ compact = false }: { compact?: boolean }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [language, setLanguage] = useState("auto");
  const { user } = useAuth();
  const nav = useNavigate();

  const upload = async (file: File) => {
    if (!user) { nav("/auth"); return; }
    if (!ALLOWED.includes(file.type) && !/\.(mp4|mov|avi|mkv)$/i.test(file.name)) {
      toast.error("Only MP4, MOV, AVI, MKV allowed"); return;
    }
    if (file.size > MAX_MB * 1024 * 1024) { toast.error(`Max ${MAX_MB} MB`); return; }
    setBusy(true); setProgress(10);
    try {
      const ext = file.name.split(".").pop() || "mp4";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("videos").upload(path, file, { contentType: file.type || "video/mp4" });
      if (upErr) throw upErr;
      setProgress(60);
      const { data: proj, error: pErr } = await supabase.from("projects").insert({
        user_id: user.id,
        title: file.name.replace(/\.[^.]+$/, ""),
        video_path: path,
        status: "uploaded",
        language,
      }).select().single();
      if (pErr) throw pErr;
      setProgress(85);
      supabase.functions.invoke("transcribe-video", { body: { project_id: proj.id, language } }).catch(() => {});
      toast.success("Uploaded! Starting AI transcription…");
      nav(`/editor/${proj.id}`);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setBusy(false); setProgress(0);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files?.[0]; if (f) upload(f);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        onClick={() => !busy && inputRef.current?.click()}
        className={`glass rounded-2xl cursor-pointer transition-all border-2 border-dashed
          ${drag ? "border-primary glow scale-[1.02]" : "border-white/10 hover:border-primary/50"}
          ${compact ? "p-6" : "p-10 md:p-14"} text-center`}
      >
        <input ref={inputRef} type="file" hidden accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,.mp4,.mov,.avi,.mkv"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        {busy ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary"/>
            <p className="text-sm">Uploading… {progress}%</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center glow">
              <UploadCloud className="w-7 h-7 text-white"/>
            </div>
            <div>
              <p className={`font-display font-semibold ${compact ? "text-base" : "text-xl"}`}>Drop your video here</p>
              <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
                <Video className="w-3.5 h-3.5"/> MP4, MOV, AVI, MKV — up to {MAX_MB} MB
              </p>
            </div>
            {!compact && <p className="text-xs text-muted-foreground">or click to browse</p>}
          </div>
        )}
      </div>

      <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
        <Languages className="w-4 h-4 text-muted-foreground shrink-0"/>
        <span className="text-xs text-muted-foreground shrink-0">Caption language:</span>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="bg-secondary/50 h-9 flex-1"><SelectValue/></SelectTrigger>
          <SelectContent>
            {LANGS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
