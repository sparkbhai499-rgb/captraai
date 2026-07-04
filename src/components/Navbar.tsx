import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sparkles, LogOut, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Navbar = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 10);
    on(); window.addEventListener("scroll", on);
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const links = [
    { to: "/", label: "Home" },
    { to: "/dashboard", label: "Dashboard", auth: true },
    { to: "/projects", label: "Projects", auth: true },
    { to: "/pricing", label: "Pricing" },
    { to: "/contact", label: "Contact" },
  ];

  const signOut = async () => { await supabase.auth.signOut(); nav("/"); };

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all ${scrolled ? "glass" : "bg-transparent"}`}>
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center glow">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span>RXP <span className="gradient-text">Caption AI</span></span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.filter(l => !l.auth || user).map(l => (
            <NavLink key={l.to} to={l.to} end
              className={({isActive}) => `px-3 py-1.5 rounded-md text-sm transition ${isActive ? "text-foreground bg-secondary" : "text-muted-foreground hover:text-foreground"}`}>
              {l.label}
            </NavLink>
          ))}
          {isAdmin && <NavLink to="/admin" className={({isActive}) => `px-3 py-1.5 rounded-md text-sm transition ${isActive ? "text-foreground bg-secondary" : "text-muted-foreground hover:text-foreground"}`}>Admin</NavLink>}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              <span className="text-xs text-muted-foreground max-w-[160px] truncate">{user.email}</span>
              <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="w-4 h-4"/></Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => nav("/auth")}>Sign in</Button>
              <Button size="sm" className="gradient-primary text-white border-0" onClick={() => nav("/auth")}>Get started</Button>
            </>
          )}
        </div>

        <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="menu">
          {open ? <X className="w-5 h-5"/> : <Menu className="w-5 h-5"/>}
        </button>
      </div>

      {open && (
        <div className="md:hidden glass border-t border-border">
          <div className="container py-3 flex flex-col gap-1">
            {links.filter(l => !l.auth || user).map(l => (
              <NavLink key={l.to} to={l.to} onClick={() => setOpen(false)}
                className={({isActive}) => `px-3 py-2 rounded-md text-sm ${isActive ? "bg-secondary" : ""}`}>{l.label}</NavLink>
            ))}
            {isAdmin && <NavLink to="/admin" onClick={() => setOpen(false)} className="px-3 py-2 rounded-md text-sm">Admin</NavLink>}
            <div className="pt-2 flex gap-2">
              {user ? (
                <Button variant="outline" size="sm" onClick={signOut} className="flex-1"><LogOut className="w-4 h-4 mr-2"/>Sign out</Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => {setOpen(false); nav("/auth");}} className="flex-1">Sign in</Button>
                  <Button size="sm" onClick={() => {setOpen(false); nav("/auth");}} className="flex-1 gradient-primary text-white border-0">Get started</Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
