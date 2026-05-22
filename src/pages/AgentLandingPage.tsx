import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Bot, Sparkles, Code2, MessageSquare, Globe2, Zap, Shield, ArrowRight, Check } from "lucide-react";

const PROJECT_REF = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const ENDPOINT = `https://${PROJECT_REF}.supabase.co/functions/v1/agent-chat`;
const DEMO_AGENT_ID = import.meta.env.VITE_DEMO_AGENT_ID || "";

export default function AgentLandingPage() {
  const widgetMounted = useRef(false);

  useEffect(() => {
    if (!DEMO_AGENT_ID || widgetMounted.current) return;
    widgetMounted.current = true;
    const s = document.createElement("script");
    s.src = "/agent-widget.js";
    s.setAttribute("data-agent-id", DEMO_AGENT_ID);
    s.setAttribute("data-endpoint", ENDPOINT);
    s.setAttribute("data-title", "Demo AI Agent");
    s.setAttribute("data-color", "#10b981");
    s.setAttribute("data-greeting", "Hi! I'm a demo AI agent. Ask me anything!");
    document.body.appendChild(s);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-emerald-950/20 text-foreground">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link to="/agent" className="flex items-center gap-2 font-bold text-lg">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          AgentForge
        </Link>
        <div className="flex items-center gap-2 sm:gap-4 text-sm">
          <a href="#features" className="hidden sm:inline text-muted-foreground hover:text-foreground">Features</a>
          <a href="#how" className="hidden sm:inline text-muted-foreground hover:text-foreground">How it works</a>
          <Link to="/my-agents" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium">
            Dashboard
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-12 pb-20 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium mb-6">
          <Sparkles className="w-3 h-3" /> Powered by Gemini & GPT-5
        </div>
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-tight">
          Build your own <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">AI Agent</span>
          <br />Embed on any website in 60 seconds
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Create a custom AI assistant trained on your business knowledge.
          Paste one script tag — done. No code. No servers. Just answers.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/my-agents" className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2">
            Create Your Agent <ArrowRight className="w-4 h-4" />
          </Link>
          <a href="#demo" className="px-6 py-3 bg-card border border-border hover:bg-accent rounded-lg font-semibold">
            Try Live Demo
          </a>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Free to start · No credit card required</p>
      </section>

      {/* Code preview */}
      <section className="px-6 pb-20 max-w-3xl mx-auto">
        <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden shadow-2xl">
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border-b border-zinc-800">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="ml-2 text-xs text-zinc-500 font-mono">your-website.html</span>
          </div>
          <pre className="p-5 text-sm font-mono text-emerald-300 overflow-x-auto">
{`<script src="https://w8sap.lovable.app/agent-widget.js"
  data-agent-id="your-agent-id"
  data-endpoint="${ENDPOINT}"
  data-title="My AI Assistant"
  data-color="#10b981">
</script>`}
          </pre>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-20 max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-3">Everything you need</h2>
        <p className="text-center text-muted-foreground mb-12">Configure once, deploy everywhere.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: Bot, t: "Custom Personality", d: "Define how your agent talks with a simple system prompt." },
            { icon: Sparkles, t: "Your Knowledge Base", d: "Paste FAQs, product info, policies — agent answers from it." },
            { icon: Globe2, t: "Embed Anywhere", d: "One script tag works on WordPress, Shopify, Webflow, anything." },
            { icon: Zap, t: "Instant Replies", d: "Streaming responses powered by Gemini 3 Flash & GPT-5." },
            { icon: MessageSquare, t: "Conversation History", d: "See every chat from every visitor in your dashboard." },
            { icon: Shield, t: "Secure & Private", d: "Your data, your agent. Public/private toggle per agent." },
          ].map((f) => (
            <div key={f.t} className="p-6 rounded-xl bg-card border border-border hover:border-emerald-500/50 transition">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="font-semibold mb-1">{f.t}</h3>
              <p className="text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="px-6 py-20 max-w-5xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">From zero to live in 3 steps</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { n: "01", t: "Create Agent", d: "Name it, write a system prompt, paste your knowledge base." },
            { n: "02", t: "Copy Embed Code", d: "Get a one-line script tag from the dashboard." },
            { n: "03", t: "Paste on Website", d: "Drop it into your site's HTML. Chat bubble appears instantly." },
          ].map((s) => (
            <div key={s.n} className="relative p-6 rounded-xl bg-card border border-border">
              <div className="text-5xl font-black text-emerald-500/20 absolute top-3 right-4">{s.n}</div>
              <h3 className="font-semibold text-lg mb-2">{s.t}</h3>
              <p className="text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Demo */}
      <section id="demo" className="px-6 py-20 max-w-4xl mx-auto text-center">
        <Code2 className="w-10 h-10 mx-auto text-emerald-400 mb-4" />
        <h2 className="text-3xl sm:text-4xl font-bold mb-3">Try it right now</h2>
        <p className="text-muted-foreground mb-8">
          {DEMO_AGENT_ID
            ? "Click the chat bubble in the bottom-right corner →"
            : "Set up a demo agent: create one in the dashboard, mark it public, then add VITE_DEMO_AGENT_ID env var with its ID."}
        </p>
        <Link to="/my-agents" className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold">
          Open Dashboard <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* Pricing-ish */}
      <section className="px-6 py-20 max-w-3xl mx-auto">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 p-8 text-center">
          <h2 className="text-3xl font-bold mb-2">Get started free</h2>
          <p className="text-muted-foreground mb-6">All features included. Pay only for AI usage as you grow.</p>
          <ul className="text-sm space-y-2 max-w-xs mx-auto text-left mb-8">
            {["Unlimited agents", "Unlimited conversations", "Custom branding", "Conversation analytics", "Multiple AI models"].map((x) => (
              <li key={x} className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" />{x}</li>
            ))}
          </ul>
          <Link to="/my-agents" className="inline-flex items-center gap-2 px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold">
            Build My Agent <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="px-6 py-8 border-t border-border text-center text-xs text-muted-foreground">
        Built with AgentForge · Powered by Lovable AI
      </footer>
    </div>
  );
}
