import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Video, StickyNote, Megaphone, Download, ArrowLeft, Loader2, Play } from "lucide-react";
import { toast } from "sonner";

interface Content { id: string; type: string; title: string; description: string | null; file_path: string | null; video_url: string | null; }
interface Announcement { id: string; title: string; message: string; created_at: string; }
interface Batch { id: string; name: string; description: string | null; price: number; }

const youtubeEmbed = (url: string) => {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
};

const BatchDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [contents, setContents] = useState<Content[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paymentReq, setPaymentReq] = useState<{ status: string; utr: string; created_at: string } | null>(null);

  const [hasSub, setHasSub] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      setLoading(true);
      const { data: b } = await supabase.from("batches").select("id,name,description,price").eq("id", id).maybeSingle();
      setBatch(b);
      const [{ data: en }, { data: sub }, { data: pr }] = await Promise.all([
        supabase.from("batch_enrollments").select("id").eq("batch_id", id).eq("user_id", user.id).maybeSingle(),
        supabase.from("user_subscriptions").select("id").eq("user_id", user.id).gt("expires_at", new Date().toISOString()).maybeSingle(),
        supabase.from("payment_requests").select("status,utr,created_at").eq("user_id", user.id).eq("batch_id", id).eq("type", "batch").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      const access = !!en || !!sub;
      setEnrolled(access); setHasSub(!!sub); setPaymentReq(pr);
      if (access) {
        const [{ data: c }, { data: a }] = await Promise.all([
          supabase.from("batch_contents").select("*").eq("batch_id", id).order("order_index"),
          supabase.from("batch_announcements").select("*").eq("batch_id", id).order("created_at", { ascending: false }),
        ]);
        setContents(c || []); setAnnouncements(a || []);
      }
      setLoading(false);
    })();
  }, [id, user]);

  const openPdf = async (path: string) => {
    const { data, error } = await supabase.storage.from("batch-pdfs").createSignedUrl(path, 3600);
    if (error || !data) { toast.error("Could not load PDF"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const enrollFree = async () => {
    if (!user || !id) return;
    const { error } = await supabase.from("batch_enrollments").insert({ batch_id: id, user_id: user.id });
    if (error) toast.error(error.message); else { setEnrolled(true); window.location.reload(); }
  };

  if (loading) return <AppShell><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div></AppShell>;
  if (!batch) return <AppShell><p>Batch not found.</p></AppShell>;

  const pdfs = contents.filter((c) => c.type === "pdf");
  const videos = contents.filter((c) => c.type === "video");
  const notes = contents.filter((c) => c.type === "note");

  return (
    <AppShell>
      <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mb-4 gap-1"><ArrowLeft className="w-4 h-4" />Back</Button>
      <div className="bg-card rounded-2xl p-6 border border-border shadow-card mb-6">
        <h1 className="text-2xl font-bold mb-2">{batch.name}</h1>
        <p className="text-muted-foreground">{batch.description}</p>
        {!enrolled && (
          batch.price && batch.price > 0 ? (
            <div className="mt-4 space-y-3">
              {paymentReq?.status === "pending" && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                  <p className="font-semibold text-amber-700 dark:text-amber-300">⏳ Payment under review</p>
                  <p className="text-xs text-muted-foreground mt-0.5">UTR: {paymentReq.utr} · Submitted {new Date(paymentReq.created_at).toLocaleString()}. Admin verify karne ke baad access mil jayega.</p>
                </div>
              )}
              {paymentReq?.status === "rejected" && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm">
                  <p className="font-semibold text-destructive">✕ Payment rejected</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Last UTR: {paymentReq.utr}. Phir se try karein.</p>
                </div>
              )}
              <Button onClick={() => navigate(`/pay?type=batch&id=${batch.id}`)}>
                {paymentReq?.status === "pending" ? "View payment" : paymentReq?.status === "rejected" ? "Retry payment" : `Buy ₹${batch.price}`}
              </Button>
            </div>
          ) : (
            <Button onClick={enrollFree} className="mt-4">Enroll Free</Button>
          )
        )}
        {hasSub && enrolled && <p className="text-xs text-emerald-600 mt-2">✓ Access via All-Access subscription</p>}
      </div>

      {enrolled && (
        <Tabs defaultValue="pdfs" className="w-full">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="pdfs"><FileText className="w-4 h-4 mr-1.5" />PDFs ({pdfs.length})</TabsTrigger>
            <TabsTrigger value="videos"><Video className="w-4 h-4 mr-1.5" />Videos ({videos.length})</TabsTrigger>
            <TabsTrigger value="notes"><StickyNote className="w-4 h-4 mr-1.5" />Notes ({notes.length})</TabsTrigger>
            <TabsTrigger value="announcements"><Megaphone className="w-4 h-4 mr-1.5" />News ({announcements.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pdfs" className="mt-6 space-y-3">
            {pdfs.length === 0 ? <p className="text-muted-foreground text-sm">No PDFs yet.</p> : pdfs.map((p) => (
              <div key={p.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0"><FileText className="w-5 h-5 text-accent-foreground" /></div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.title}</p>
                    {p.description && <p className="text-xs text-muted-foreground truncate">{p.description}</p>}
                  </div>
                </div>
                <Button size="sm" onClick={() => p.file_path && openPdf(p.file_path)} className="gap-1.5"><Download className="w-4 h-4" />Open</Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="videos" className="mt-6 space-y-4">
            {videos.length === 0 ? <p className="text-muted-foreground text-sm">No videos yet.</p> : videos.map((v) => {
              const embed = v.video_url ? youtubeEmbed(v.video_url) : null;
              return (
                <div key={v.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  {embed ? (
                    <div className="aspect-video"><iframe src={embed} className="w-full h-full" allowFullScreen title={v.title} /></div>
                  ) : v.video_url ? (
                    <video src={v.video_url} controls className="w-full aspect-video bg-black" />
                  ) : (
                    <div className="aspect-video bg-muted flex items-center justify-center"><Play className="w-12 h-12 text-muted-foreground" /></div>
                  )}
                  <div className="p-4">
                    <p className="font-medium">{v.title}</p>
                    {v.description && <p className="text-sm text-muted-foreground mt-1">{v.description}</p>}
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="notes" className="mt-6 space-y-3">
            {notes.length === 0 ? <p className="text-muted-foreground text-sm">No notes yet.</p> : notes.map((n) => (
              <div key={n.id} className="bg-card border border-border rounded-xl p-4">
                <p className="font-medium mb-1">{n.title}</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{n.description}</p>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="announcements" className="mt-6 space-y-3">
            {announcements.length === 0 ? <p className="text-muted-foreground text-sm">No announcements.</p> : announcements.map((a) => (
              <div key={a.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0"><Megaphone className="w-5 h-5 text-accent-foreground" /></div>
                  <div className="flex-1">
                    <p className="font-medium">{a.title}</p>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      )}
    </AppShell>
  );
};

export default BatchDetailPage;
