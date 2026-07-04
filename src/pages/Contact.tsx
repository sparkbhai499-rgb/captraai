import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Mail, MessageCircle, Twitter } from "lucide-react";

const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.from("contact_messages").insert(form);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Message sent!");
    setForm({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="container pt-32 pb-16 grid lg:grid-cols-2 gap-10 max-w-5xl">
        <div>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Contact us</h1>
          <p className="text-muted-foreground mb-8">We usually respond within a few hours. For urgent issues, use email.</p>
          <div className="space-y-4">
            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg glass flex items-center justify-center"><Mail className="w-4 h-4"/></div><div><p className="font-medium text-sm">Email</p><p className="text-xs text-muted-foreground">support@rxpcaption.ai</p></div></div>
            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg glass flex items-center justify-center"><MessageCircle className="w-4 h-4"/></div><div><p className="font-medium text-sm">Live chat</p><p className="text-xs text-muted-foreground">In-app, Mon–Sat 10am–8pm IST</p></div></div>
            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg glass flex items-center justify-center"><Twitter className="w-4 h-4"/></div><div><p className="font-medium text-sm">Twitter</p><p className="text-xs text-muted-foreground">@rxpcaptionai</p></div></div>
          </div>
        </div>
        <GlassCard>
          <form onSubmit={submit} className="space-y-4">
            <Input required placeholder="Name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="bg-secondary/50"/>
            <Input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="bg-secondary/50"/>
            <Input placeholder="Subject" value={form.subject} onChange={(e) => setForm({...form, subject: e.target.value})} className="bg-secondary/50"/>
            <Textarea required rows={5} placeholder="Your message" value={form.message} onChange={(e) => setForm({...form, message: e.target.value})} className="bg-secondary/50"/>
            <Button type="submit" disabled={busy} className="w-full gradient-primary text-white border-0">{busy ? "Sending…" : "Send"}</Button>
          </form>
        </GlassCard>
      </section>
      <Footer />
    </div>
  );
};

export default Contact;
