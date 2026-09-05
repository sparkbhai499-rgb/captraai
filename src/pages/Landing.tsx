import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { InstallButton } from "@/components/InstallButton";
import appLogo from "@/assets/captra-logo.png";
import { UploadDropzone } from "@/components/UploadDropzone";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Wand2, Languages, Palette, Download, Youtube, Zap, Star, Check, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const features = [
  { icon: Wand2, title: "AI Auto Captions", desc: "OpenAI Whisper-grade transcription in seconds. Punctuation, timing — all automatic." },
  { icon: Languages, title: "Multilingual", desc: "Hindi, English, Hinglish, Spanish, Arabic and 40+ languages, auto-detected." },
  { icon: Palette, title: "Full Style Control", desc: "Font, color, size, position, background — make captions match your brand." },
  { icon: Download, title: "Export Anywhere", desc: "Download as SRT, VTT, TXT or burn captions directly into your video." },
  { icon: Youtube, title: "YouTube AI Kit", desc: "Generate title, description, tags & hashtags optimized for reach." },
  { icon: Zap, title: "Blazing Fast", desc: "Cloud-processed. Get a 10-minute video captioned in under a minute." },
];

const testimonials = [
  { name: "Riya Sharma", role: "YouTuber, 340K subs", text: "Went from 3 hours per video to 3 minutes. Hindi transcription is scary good." },
  { name: "Arjun Mehta", role: "Podcast Editor", text: "The style panel + burn-in export replaced 4 tools in my workflow." },
  { name: "Sarah Chen", role: "Marketing Lead", text: "Our team ships 20+ short-form videos a week. Captra made captions a non-issue." },
  { name: "Karan Patel", role: "Creator, 1M+ views", text: "Hinglish detection actually works. Nothing else I tried came close." },
];

const faqs = [
  { q: "What video formats are supported?", a: "MP4, MOV, AVI, and MKV up to 200 MB per file on the free plan (larger on paid)." },
  { q: "Which languages can it caption?", a: "40+ including Hindi, English, Hinglish, Spanish, French, Arabic, Portuguese and Japanese. Auto-detected on upload." },
  { q: "Can I edit the captions?", a: "Yes — the editor lets you fix any word, adjust timing, restyle, and re-export instantly." },
  { q: "Can I burn captions into the video?", a: "Yes. Pro plans support burn-in exports. Free plans can always download SRT/VTT/TXT files." },
  { q: "How accurate is the AI?", a: "We use state-of-the-art transcription — 95%+ accuracy on clear audio. Punctuation and casing are automatic." },
  { q: "Is my video private?", a: "Yes. Videos are stored in a private bucket accessible only to you." },
];

const Landing = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    supabase.from("plans").select("*").order("sort_order").then(({ data }) => setPlans(data || []));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSending(true);
    const { error } = await supabase.from("contact_messages").insert(form);
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success("Message sent! We'll get back to you shortly.");
    setForm({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* HERO */}
      <section className="relative pt-40 pb-24 overflow-hidden">
        <div className="grid-fade absolute inset-0 pointer-events-none" />
        <div className="blob absolute top-1/4 left-1/4 w-[520px] h-[380px] rounded-full bg-primary/60"/>
        <div className="blob absolute top-1/3 right-1/5 w-[460px] h-[340px] rounded-full bg-[hsl(var(--neon-violet))]/50"/>

        <div className="container relative">
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.7}} className="max-w-5xl mx-auto text-center">
            <span className="inline-flex items-center gap-2 glass neon-ring rounded-full px-4 py-1.5 text-xs font-medium mb-8">
              <Sparkles className="w-3.5 h-3.5 text-accent pulse-soft"/> Premium AI creative studio
            </span>
            <h1 className="font-display font-black tracking-tight leading-[0.95] text-6xl md:text-8xl lg:text-9xl mb-8">
              Create. Edit.
              <br/>
              <span className="gradient-text neon-text">Captivate.</span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              AI-powered captions &amp; professional editing. Captra transcribes Hindi, Hinglish and 40+ languages, then lets you style every word before you export, up to 4K.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button size="lg" className="rounded-full btn-neon border-0 px-7 h-12 text-base font-semibold" asChild>
                <Link to="/auth">Try it free ✦</Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-full border-white/15 hover:bg-white/5 px-7 h-12 text-base font-semibold" asChild>
                <a href="#features">See the styles</a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-6">No card needed · first watermark-free export ₹9</p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
              {[
                { k: "40+", v: "languages" },
                { k: "95%+", v: "accuracy" },
                { k: "<60s", v: "per 10-min video" },
                { k: "4K", v: "export quality" },
              ].map((s) => (
                <div key={s.k} className="text-center">
                  <p className="font-display text-2xl md:text-3xl font-bold gradient-text">{s.k}</p>
                  <p className="text-xs text-muted-foreground">{s.v}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* PREMIUM ENTRY CARDS */}
          <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto mt-16">
            {[
              { icon: Wand2, title: "Caption AI", desc: "Generate viral, professional and creative captions in seconds.", to: "/auth" },
              { icon: Palette, title: "AI Editor", desc: "Create stunning social media content on a pro timeline.", to: "/auth" },
            ].map((c, i) => (
              <motion.div key={c.title} initial={{opacity:0,y:26}} animate={{opacity:1,y:0}} transition={{delay:0.15 + i*0.1, duration:0.6}}>
                <Link to={c.to} className="block h-full">
                  <GlassCard className="h-full p-7 group">
                    <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mb-5 glow float-3d">
                      <c.icon className="w-6 h-6 text-background"/>
                    </div>
                    <h3 className="font-display text-2xl font-bold mb-2">✦ {c.title}</h3>
                    <p className="text-sm text-muted-foreground">{c.desc}</p>
                    <span className="inline-block mt-5 text-sm font-medium text-accent group-hover:translate-x-1 transition-transform">Open →</span>
                  </GlassCard>
                </Link>
              </motion.div>
            ))}
          </div>

          <motion.div id="upload" initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{delay:0.25, duration:0.6}} className="max-w-2xl mx-auto mt-16">
            <UploadDropzone />
          </motion.div>
        </div>
      </section>


      {/* DEMO */}
      <section className="py-20 container">
        <div className="text-center mb-10">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">See AI captions in action</h2>
          <p className="text-muted-foreground">Real-time preview with editable timing and full styling.</p>
        </div>
        <GlassCard className="max-w-4xl mx-auto p-0 overflow-hidden">
          <div className="aspect-video bg-gradient-to-br from-primary/20 via-background to-accent/20 relative flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-3 glow">
                <Sparkles className="w-8 h-8 text-white"/>
              </div>
              <p className="font-display text-2xl font-semibold mb-1">Your video, captioned by AI</p>
              <p className="text-sm text-muted-foreground">Upload above to try it now</p>
            </div>
            <div className="absolute bottom-6 inset-x-6 glass rounded-xl px-4 py-3 text-center">
              <p className="font-semibold text-lg">"AI ne captions bana diye — bas 30 seconds mein!"</p>
            </div>
          </div>
        </GlassCard>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 container">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">Everything you need to caption videos</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">One tool, complete workflow. From upload to export — no switching apps.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div key={f.title} initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.05}}>
              <GlassCard className="h-full">
                <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center mb-4 glow">
                  <f.icon className="w-5 h-5 text-white"/>
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 container">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">Simple, transparent pricing</h2>
          <p className="text-muted-foreground">Start free. Upgrade when you're ready.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {plans.map((p) => (
            <GlassCard key={p.id} className={`relative ${p.is_popular ? "border-primary glow" : ""}`}>
              {p.is_popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-primary text-white text-xs px-3 py-1 rounded-full font-medium">Most Popular</div>}
              <h3 className="font-display text-xl font-bold">{p.name}</h3>
              <div className="my-4 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold">₹{p.price_inr}</span>
                <span className="text-sm text-muted-foreground">/mo</span>
              </div>
              <ul className="space-y-2 mb-6 text-sm">
                {(p.features || []).map((f: string) => (
                  <li key={f} className="flex gap-2"><Check className="w-4 h-4 text-primary shrink-0 mt-0.5"/>{f}</li>
                ))}
              </ul>
              <Button className={`w-full ${p.is_popular ? "btn-neon border-0" : ""}`} variant={p.is_popular ? "default" : "outline"} asChild>
                <Link to="/auth">Get {p.name}</Link>
              </Button>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20 container">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">Loved by creators worldwide</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {testimonials.map((t, i) => (
            <motion.div key={t.name} initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.08}}>
              <GlassCard className="h-full">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-primary text-primary"/>)}
                </div>
                <p className="text-sm mb-4">"{t.text}"</p>
                <div>
                  <p className="font-medium text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 container max-w-3xl">
        <div className="text-center mb-10">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">Frequently asked questions</h2>
        </div>
        <Accordion type="single" collapsible className="glass rounded-2xl px-4">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`i${i}`} className="border-b border-white/5 last:border-0">
              <AccordionTrigger className="text-left font-medium">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-20 container max-w-2xl">
        <div className="text-center mb-10">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">Get in touch</h2>
          <p className="text-muted-foreground">Questions, feedback, partnerships — we'd love to hear from you.</p>
        </div>
        <GlassCard>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Input required placeholder="Your name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="bg-secondary/50"/>
              <Input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="bg-secondary/50"/>
            </div>
            <Input placeholder="Subject" value={form.subject} onChange={(e) => setForm({...form, subject: e.target.value})} className="bg-secondary/50"/>
            <Textarea required rows={5} placeholder="Your message" value={form.message} onChange={(e) => setForm({...form, message: e.target.value})} className="bg-secondary/50"/>
            <Button type="submit" className="w-full btn-neon border-0" disabled={sending}>
              {sending ? "Sending…" : "Send message"}
            </Button>
          </form>
        </GlassCard>
      </section>

      {/* INSTALL APP */}
      <section className="py-20 container">
        <GlassCard className="max-w-4xl mx-auto relative overflow-hidden">
          <div className="blob absolute -top-20 right-0 w-[320px] h-[220px] rounded-full bg-primary/50"/>
          <div className="relative flex flex-col md:flex-row items-center gap-8">
            <motion.img
              src={appLogo}
              alt="Captra AI app icon"
              loading="lazy"
              width={128}
              height={128}
              className="w-28 h-28 rounded-3xl shrink-0"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="text-center md:text-left flex-1">
              <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">Install Captra AI on your device</h2>
              <p className="text-sm text-muted-foreground mb-5 max-w-lg">
                One tap and it lives on your home screen — full-screen studio, faster launch, works like a native app on phone and desktop.
              </p>
              <div className="flex justify-center md:justify-start"><InstallButton /></div>
            </div>
          </div>
        </GlassCard>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;
