import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, FileText, Video, StickyNote, Megaphone, Upload } from "lucide-react";
import { toast } from "sonner";

const AdminPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [contents, setContents] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  // create batch
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCover, setNewCover] = useState("");
  const [creating, setCreating] = useState(false);

  // content add
  const [cType, setCType] = useState("pdf");
  const [cTitle, setCTitle] = useState("");
  const [cDesc, setCDesc] = useState("");
  const [cVideoUrl, setCVideoUrl] = useState("");
  const [cFile, setCFile] = useState<File | null>(null);
  const [adding, setAdding] = useState(false);

  // announcement
  const [aTitle, setATitle] = useState("");
  const [aMsg, setAMsg] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/"); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    supabase.from("batches").select("*").order("created_at", { ascending: false }).then(({ data }) => setBatches(data || []));
  }, [isAdmin]);

  useEffect(() => {
    if (!selected) { setContents([]); setAnnouncements([]); return; }
    supabase.from("batch_contents").select("*").eq("batch_id", selected).order("order_index").then(({ data }) => setContents(data || []));
    supabase.from("batch_announcements").select("*").eq("batch_id", selected).order("created_at", { ascending: false }).then(({ data }) => setAnnouncements(data || []));
  }, [selected]);

  const createBatch = async () => {
    if (!newName.trim() || !user) return;
    setCreating(true);
    const { data, error } = await supabase.from("batches").insert({
      name: newName.trim(), description: newDesc.trim() || null, cover_image: newCover.trim() || null, created_by: user.id,
    }).select().single();
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    setBatches([data, ...batches]);
    setNewName(""); setNewDesc(""); setNewCover("");
    toast.success("Batch created!");
  };

  const deleteBatch = async (id: string) => {
    if (!confirm("Delete this batch and all its content?")) return;
    const { error } = await supabase.from("batches").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setBatches(batches.filter((b) => b.id !== id));
    if (selected === id) setSelected(null);
  };

  const addContent = async () => {
    if (!selected || !cTitle.trim()) return;
    setAdding(true);
    let file_path: string | null = null;
    if (cType === "pdf") {
      if (!cFile) { toast.error("Pick a PDF file"); setAdding(false); return; }
      const path = `${selected}/${Date.now()}-${cFile.name}`;
      const { error: upErr } = await supabase.storage.from("batch-pdfs").upload(path, cFile);
      if (upErr) { toast.error(upErr.message); setAdding(false); return; }
      file_path = path;
    }
    const { data, error } = await supabase.from("batch_contents").insert({
      batch_id: selected, type: cType, title: cTitle.trim(),
      description: cDesc.trim() || null,
      file_path, video_url: cType === "video" ? cVideoUrl.trim() || null : null,
      order_index: contents.length,
    }).select().single();
    setAdding(false);
    if (error) { toast.error(error.message); return; }
    setContents([...contents, data]);
    setCTitle(""); setCDesc(""); setCVideoUrl(""); setCFile(null);
    toast.success("Added!");
  };

  const deleteContent = async (c: any) => {
    if (!confirm("Delete this item?")) return;
    if (c.file_path) await supabase.storage.from("batch-pdfs").remove([c.file_path]);
    await supabase.from("batch_contents").delete().eq("id", c.id);
    setContents(contents.filter((x) => x.id !== c.id));
  };

  const addAnnouncement = async () => {
    if (!selected || !aTitle.trim() || !aMsg.trim()) return;
    const { data, error } = await supabase.from("batch_announcements").insert({
      batch_id: selected, title: aTitle.trim(), message: aMsg.trim(),
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setAnnouncements([data, ...announcements]);
    setATitle(""); setAMsg("");
    toast.success("Posted!");
  };

  const deleteAnnouncement = async (id: string) => {
    await supabase.from("batch_announcements").delete().eq("id", id);
    setAnnouncements(announcements.filter((a) => a.id !== id));
  };

  if (authLoading || isAdmin === null) return <AppShell><Loader2 className="w-6 h-6 animate-spin text-primary" /></AppShell>;
  if (!isAdmin) return <AppShell><p className="text-center py-20 text-muted-foreground">Admin access required.</p></AppShell>;

  return (
    <AppShell>
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Batches list + create */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Plus className="w-4 h-4" />Create Batch</h2>
            <div className="space-y-2">
              <Input placeholder="Batch name" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <Textarea placeholder="Description" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2} />
              <Input placeholder="Cover image URL (optional)" value={newCover} onChange={(e) => setNewCover(e.target.value)} />
              <Button onClick={createBatch} disabled={creating || !newName.trim()} className="w-full">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
              </Button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
            <h2 className="font-semibold mb-3">All Batches</h2>
            <div className="space-y-2">
              {batches.map((b) => (
                <div key={b.id}
                  className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between ${selected === b.id ? "border-primary bg-accent" : "border-border hover:bg-muted"}`}
                  onClick={() => setSelected(b.id)}>
                  <span className="font-medium truncate text-sm">{b.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); deleteBatch(b.id); }} className="text-destructive hover:opacity-70">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {batches.length === 0 && <p className="text-sm text-muted-foreground">No batches yet.</p>}
            </div>
          </div>
        </div>

        {/* Selected batch management */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground shadow-card">
              Select a batch to manage its content
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
              <Tabs defaultValue="content">
                <TabsList>
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="announcements">Announcements</TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-4 mt-4">
                  <div className="border border-border rounded-xl p-4 space-y-2 bg-muted/30">
                    <h3 className="font-semibold text-sm">Add new</h3>
                    <Select value={cType} onValueChange={setCType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF / Notes file</SelectItem>
                        <SelectItem value="video">Video lecture (URL)</SelectItem>
                        <SelectItem value="note">Text note</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="Title" value={cTitle} onChange={(e) => setCTitle(e.target.value)} />
                    <Textarea placeholder="Description / note text" value={cDesc} onChange={(e) => setCDesc(e.target.value)} rows={2} />
                    {cType === "pdf" && (
                      <Input type="file" accept="application/pdf" onChange={(e) => setCFile(e.target.files?.[0] || null)} />
                    )}
                    {cType === "video" && (
                      <Input placeholder="YouTube URL or video file URL" value={cVideoUrl} onChange={(e) => setCVideoUrl(e.target.value)} />
                    )}
                    <Button onClick={addContent} disabled={adding} className="gap-1.5">
                      {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Upload className="w-4 h-4" />Add</>}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {contents.map((c) => {
                      const Icon = c.type === "pdf" ? FileText : c.type === "video" ? Video : StickyNote;
                      return (
                        <div key={c.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                          <div className="flex items-center gap-3 min-w-0">
                            <Icon className="w-4 h-4 text-primary shrink-0" />
                            <span className="text-sm font-medium truncate">{c.title}</span>
                          </div>
                          <button onClick={() => deleteContent(c)} className="text-destructive hover:opacity-70">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                    {contents.length === 0 && <p className="text-sm text-muted-foreground">No content yet.</p>}
                  </div>
                </TabsContent>

                <TabsContent value="announcements" className="space-y-4 mt-4">
                  <div className="border border-border rounded-xl p-4 space-y-2 bg-muted/30">
                    <h3 className="font-semibold text-sm flex items-center gap-1.5"><Megaphone className="w-4 h-4" />Post Announcement</h3>
                    <Input placeholder="Title" value={aTitle} onChange={(e) => setATitle(e.target.value)} />
                    <Textarea placeholder="Message" value={aMsg} onChange={(e) => setAMsg(e.target.value)} rows={3} />
                    <Button onClick={addAnnouncement}>Post</Button>
                  </div>
                  <div className="space-y-2">
                    {announcements.map((a) => (
                      <div key={a.id} className="p-3 border border-border rounded-lg flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{a.title}</p>
                          <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">{a.message}</p>
                        </div>
                        <button onClick={() => deleteAnnouncement(a.id)} className="text-destructive hover:opacity-70 shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default AdminPage;
