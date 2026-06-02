import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, ReactNode } from "react";
import { GraduationCap, LogOut, User as UserIcon, Shield, BookOpen, LayoutGrid, Crown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export const AppShell = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
    supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setName(data?.display_name || user.email || ""));
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">StudyHub</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link to="/"><Button variant="ghost" size="sm" className="gap-1.5"><LayoutGrid className="w-4 h-4" />Browse</Button></Link>
            <Link to="/my-batches"><Button variant="ghost" size="sm" className="gap-1.5"><BookOpen className="w-4 h-4" />My Batches</Button></Link>
            <Link to="/subscriptions"><Button variant="ghost" size="sm" className="gap-1.5"><Crown className="w-4 h-4" />Premium</Button></Link>
            {isAdmin && (
              <Link to="/admin"><Button variant="ghost" size="sm" className="gap-1.5"><Shield className="w-4 h-4" />Admin</Button></Link>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full ml-1">
                  <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-semibold text-sm">
                    {name.charAt(0).toUpperCase() || "U"}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate("/profile")}><UserIcon className="w-4 h-4 mr-2" />Profile</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
};
