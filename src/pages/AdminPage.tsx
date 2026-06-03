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
import { Loader2, Plus, Trash2, FileText, Video, StickyNote, Megaphone, Upload, Check, X, Eye, ImageIcon, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

const AdminPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState("batches");

  // batches
  const [batches, setBatches] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [contents, setContents] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPrice, setNewPrice] = useState("0");
  const [coverMode, setCoverMode] = useState<"upload" | "url">("upload");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState("");
  const [creating, setCreating] = useState(false);

  const [cType, setCType] = useState("pdf");
  const [cTitle, setCTitle] = useState("");
  const [cDesc, setCDesc] = useState("");
  const [cVideoUrl, setCVideoUrl] = useState("");
  const [cFile, setCFile] = useState<File | null>(null);
  const [adding, setAdding] = useState(false);

  const [aTitle, setATitle] = useState("");
  const [aMsg, setAMsg] = useState("");

  // settings
  const [settings, setSettings] = useState<any>(null);
  const [upiId, setUpiId] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [instructions, setInstructions] = useState("");

  // plans
  const [plans, setPlans] = useState<any[]>([]);
  const [pName, setPName] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pPrice, setPPrice] = useState("");
  const [pDays, setPDays] = useState("30");

  // requests
  const [requests, setRequests] = useState<any[]>([]);

  // edit batch dialog
  const [editing, setEditing] = useState<any | null>(null);
  const [eName, setEName] = useState("");
  const [eDesc, setEDesc] = useState("");
  const [ePrice, setEPrice] = useState("0");
  const [ePublished, setEPublished] = useState(true);
  const [eCoverMode, setECoverMode] = useState<"keep" | "upload" | "url">("keep");
  const [eCoverFile, setECoverFile] = useState<File | null>(null);
  const [eCoverUrl, setECoverUrl] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const openEdit = (b: any) => {
    setEditing(b);
    setEName(b.name); setEDesc(b.description || ""); setEPrice(String(b.price || 0));
    setEPublished(!!b.is_published); setECoverMode("keep"); setECoverFile(null); setECoverUrl(b.cover_image || "");
  };

  const saveEdit = async () => {
    if (!editing || !eName.trim()) return;
    setSavingEdit(true);
    let cover: string | null = editing.cover_image;
    if (eCoverMode === "upload" && eCoverFile) {
      const u = await uploadThumbnail(eCoverFile);
      if (!u) { setSavingEdit(false); return; }
      cover = u;
    } else if (eCoverMode === "url") cover = eCoverUrl.trim() || null;
    const { data, error } = await supabase.from("batches").update({
      name: eName.trim(), description: eDesc.trim() || null,
      price: parseFloat(ePrice) || 0, is_published: ePublished, cover_image: cover,
      updated_at: new Date().toISOString(),
    }).eq("id", editing.id).select().single();
    setSavingEdit(false);
    if (error) { toast.error(error.message); return; }
    setBatches(batches.map((x) => x.id === data.id ? data : x));
    setEditing(null);
    toast.success("Batch updated!");
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/"); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    supabase.from("batches").select("*").order("created_at", { ascending: false }).then(({ data }) => setBatches(data || []));
    supabase.from("payment_settings").select("*").limit(1).maybeSingle().then(({ data }) => {
      setSettings(data); setUpiId(data?.upi_id || ""); setQrUrl(data?.qr_image_url || ""); setInstructions(data?.instructions || "");
    });
    supabase.from("subscription_plans").select("*").order("price").then(({ data }) => setPlans(data || []));
    loadRequests();
  }, [isAdmin]);

  const loadRequests = async () => {
    const { data } = await supabase.from("payment_requests")
      .select("*, batches(name), subscription_plans(name)")
      .order("created_at", { ascending: false });
    const rows = data || [];
    const userIds = [...new Set(rows.map((r: any) => r.user_id))];
    const { data: profs } = await supabase.from("profiles").select("user_id,display_name").in("user_id", userIds);
    const map = new Map((profs || []).map((p: any) => [p.user_id, p.display_name]));
    setRequests(rows.map((r: any) => ({ ...r, profiles: { display_name: map.get(r.user_id) } })));
  };

  useEffect(() => {
    if (!selected) { setContents([]); setAnnouncements([]); return; }
    supabase.from("batch_contents").select("*").eq("batch_id", selected).order("order_index").then(({ data }) => setContents(data || []));
    supabase.from("batch_announcements").select("*").eq("batch_id", selected).order("created_at", { ascending: false }).then(({ data }) => setAnnouncements(data || []));
  }, [selected]);

  const uploadThumbnail = async (file: File): Promise<string | null> => {
    const path = `batch-thumbnails/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file);
    if (error) { toast.error(error.message); return null; }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl;
  };

  const createBatch = async () => {
    if (!newName.trim() || !user) return;
    setCreating(true);
    let cover: string | null = null;
    if (coverMode === "upload" && coverFile) {
      cover = await uploadThumbnail(coverFile);
      if (!cover) { setCreating(false); return; }
    } else if (coverMode === "url" && coverUrl.trim()) cover = coverUrl.trim();
    const { data, error } = await supabase.from("batches").insert({
      name: newName.trim(), description: newDesc.trim() || null, cover_image: cover,
      price: parseFloat(newPrice) || 0, created_by: user.id,
    }).select().single();
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    setBatches([data, ...batches]);
    setNewName(""); setNewDesc(""); setNewPrice("0"); setCoverFile(null); setCoverUrl("");
    toast.success("Batch created!");
  };

  const deleteBatch = async (id: string) => {
    if (!confirm("Delete this batch?")) return;
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
      if (!cFile) { toast.error("Pick a PDF"); setAdding(false); return; }
      const path = `${selected}/${Date.now()}-${cFile.name}`;
      const { error: upErr } = await supabase.storage.from("batch-pdfs").upload(path, cFile);
      if (upErr) { toast.error(upErr.message); setAdding(false); return; }
      file_path = path;
    }
    const { data, error } = await supabase.from("batch_contents").insert({
      batch_id: selected, type: cType, title: cTitle.trim(),
      description: cDesc.trim() || null, file_path,
      video_url: cType === "video" ? cVideoUrl.trim() || null : null,
      order_index: contents.length,
    }).select().single();
    setAdding(false);
    if (error) { toast.error(error.message); return; }
    setContents([...contents, data]);
    setCTitle(""); setCDesc(""); setCVideoUrl(""); setCFile(null);
    toast.success("Added!");
  };

  const deleteContent = async (c: any) => {
    if (!confirm("Delete?")) return;
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
  };

  const deleteAnnouncement = async (id: string) => {
    await supabase.from("batch_announcements").delete().eq("id", id);
    setAnnouncements(announcements.filter((a) => a.id !== id));
  };

  const saveSettings = async () => {
    let qr = qrUrl;
    if (qrFile) {
      const url = await uploadThumbnail(qrFile);
      if (url) qr = url;
    }
    const payload = { upi_id: upiId.trim() || null, qr_image_url: qr || null, instructions: instructions.trim() || null, updated_at: new Date().toISOString() };
    const { error } = settings?.id
      ? await supabase.from("payment_settings").update(payload).eq("id", settings.id)
      : await supabase.from("payment_settings").insert(payload);
    if (error) toast.error(error.message); else { toast.success("Saved!"); setQrUrl(qr); setQrFile(null); }
  };

  const createPlan = async () => {
    if (!pName.trim() || !pPrice || !pDays) return;
    const { data, error } = await supabase.from("subscription_plans").insert({
      name: pName.trim(), description: pDesc.trim() || null, price: parseFloat(pPrice), duration_days: parseInt(pDays),
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setPlans([...plans, data]);
    setPName(""); setPDesc(""); setPPrice(""); setPDays("30");
    toast.success("Plan added!");
  };

  const deletePlan = async (id: string) => {
    if (!confirm("Delete plan?")) return;
    await supabase.from("subscription_plans").delete().eq("id", id);
    setPlans(plans.filter((p) => p.id !== id));
  };

  const viewProof = async (path: string) => {
    const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const reviewRequest = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("payment_requests").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "approved" ? "Approved & access granted!" : "Rejected");
    loadRequests();
  };

  if (authLoading || isAdmin === null) return <AppShell><Loader2 className="w-6 h-6 animate-spin text-primary" /></AppShell>;
  if (!isAdmin) return <AppShell><p className="text-center py-20 text-muted-foreground">Admin access required.</p></AppShell>;

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <AppShell>
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="batches">Batches</TabsTrigger>
          <TabsTrigger value="requests">Payments {pendingCount > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground text-xs">{pendingCount}</span>}</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="settings">UPI / QR</TabsTrigger>
        </TabsList>

        <TabsContent value="batches">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
                <h2 className="font-semibold mb-3 flex items-center gap-2"><Plus className="w-4 h-4" />Create Batch</h2>
                <div className="space-y-2">
                  <Input placeholder="Batch name" value={newName} onChange={(e) => setNewName(e.target.value)} />
                  <Textarea placeholder="Description" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2} />
                  <Input type="number" min="0" placeholder="Price ₹ (0 = free)" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
                  <div className="rounded-lg border border-border p-2 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" />Thumbnail</p>
                    <Select value={coverMode} onValueChange={(v: any) => setCoverMode(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="upload">Upload image</SelectItem>
                        <SelectItem value="url">Paste URL</SelectItem>
                      </SelectContent>
                    </Select>
                    {coverMode === "upload" ? (
                      <Input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
                    ) : (
                      <Input placeholder="https://..." value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} />
                    )}
                  </div>
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
                      <div className="min-w-0">
                        <p className="font-medium truncate text-sm">{b.name}</p>
                        <p className="text-xs text-muted-foreground">{b.price > 0 ? `₹${b.price}` : "Free"}</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); deleteBatch(b.id); }} className="text-destructive hover:opacity-70">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {batches.length === 0 && <p className="text-sm text-muted-foreground">No batches yet.</p>}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              {!selected ? (
                <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground shadow-card">Select a batch to manage</div>
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
                        {cType === "pdf" && <Input type="file" accept="application/pdf" onChange={(e) => setCFile(e.target.files?.[0] || null)} />}
                        {cType === "video" && <Input placeholder="YouTube URL or video file URL" value={cVideoUrl} onChange={(e) => setCVideoUrl(e.target.value)} />}
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
                              <button onClick={() => deleteContent(c)} className="text-destructive hover:opacity-70"><Trash2 className="w-4 h-4" /></button>
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
                            <button onClick={() => deleteAnnouncement(a.id)} className="text-destructive hover:opacity-70 shrink-0"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="requests">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
            <h2 className="font-semibold mb-4">Payment Requests</h2>
            <div className="space-y-3">
              {requests.length === 0 && <p className="text-sm text-muted-foreground">No payment requests yet.</p>}
              {requests.map((r) => (
                <div key={r.id} className="border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{r.profiles?.display_name || "User"}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-accent">{r.type === "batch" ? "Batch" : "Subscription"}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === "pending" ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : r.status === "approved" ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-destructive/20 text-destructive"}`}>{r.status}</span>
                      </div>
                      <p className="text-sm mt-1">{r.batches?.name || r.subscription_plans?.name} · <span className="font-semibold">₹{r.amount}</span></p>
                      <p className="text-xs text-muted-foreground mt-1">UTR: {r.utr} · {new Date(r.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => viewProof(r.screenshot_path)} className="gap-1"><Eye className="w-3.5 h-3.5" />Proof</Button>
                      {r.status === "pending" && (
                        <>
                          <Button size="sm" onClick={() => reviewRequest(r.id, "approved")} className="gap-1 bg-emerald-600 hover:bg-emerald-700"><Check className="w-3.5 h-3.5" />Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => reviewRequest(r.id, "rejected")} className="gap-1"><X className="w-3.5 h-3.5" />Reject</Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="plans">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-2">
              <h2 className="font-semibold mb-2">Create Subscription Plan</h2>
              <Input placeholder="Plan name (e.g. Monthly Premium)" value={pName} onChange={(e) => setPName(e.target.value)} />
              <Textarea placeholder="Description" value={pDesc} onChange={(e) => setPDesc(e.target.value)} rows={2} />
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" placeholder="Price ₹" value={pPrice} onChange={(e) => setPPrice(e.target.value)} />
                <Input type="number" placeholder="Days" value={pDays} onChange={(e) => setPDays(e.target.value)} />
              </div>
              <Button onClick={createPlan} className="w-full">Add Plan</Button>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
              <h2 className="font-semibold mb-3">All Plans</h2>
              <div className="space-y-2">
                {plans.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground">₹{p.price} · {p.duration_days} days</p>
                    </div>
                    <button onClick={() => deletePlan(p.id)} className="text-destructive hover:opacity-70"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                {plans.length === 0 && <p className="text-sm text-muted-foreground">No plans yet.</p>}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-card max-w-2xl space-y-3">
            <h2 className="font-semibold mb-2">Payment Settings (UPI / QR)</h2>
            <div>
              <label className="text-sm font-medium">UPI ID</label>
              <Input placeholder="yourname@upi" value={upiId} onChange={(e) => setUpiId(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">QR code image</label>
              {qrUrl && <img src={qrUrl} alt="QR" className="w-32 h-32 mt-1 mb-2 object-contain border border-border rounded-lg bg-white p-1" />}
              <Input type="file" accept="image/*" onChange={(e) => setQrFile(e.target.files?.[0] || null)} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Upload your UPI QR code image. Or paste URL below:</p>
              <Input placeholder="Or QR image URL" value={qrUrl} onChange={(e) => setQrUrl(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Instructions to students</label>
              <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} className="mt-1" />
            </div>
            <Button onClick={saveSettings}>Save</Button>
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
};

export default AdminPage;
