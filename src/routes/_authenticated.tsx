import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { Brain, LayoutDashboard, Sparkles, MessageSquare, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/planner", label: "AI Planner", icon: Sparkles },
  { to: "/chat", label: "AI Coach", icon: MessageSquare },
] as const;

function AuthLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col gap-1 border-r border-border/60 bg-sidebar/60 p-4 backdrop-blur md:flex">
        <Link to="/dashboard" className="mb-6 flex items-center gap-2 px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--mint)] to-[var(--mint-glow)] shadow-glow">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold">Thought→Action</span>
        </Link>
        <nav className="flex-1 space-y-1">
          {NAV.map((n) => {
            const active = location.pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent text-foreground ring-1 ring-[var(--mint)]/30"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                }`}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border/60 pt-3">
          <div className="px-2 pb-2 text-xs text-muted-foreground truncate">{user.email}</div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => supabase.auth.signOut()}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-20 flex items-center justify-between border-b border-border/60 bg-sidebar/80 px-4 py-3 backdrop-blur">
        <Link to="/dashboard" className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-[var(--mint)]" />
          <span className="font-display font-semibold text-sm">Thought→Action</span>
        </Link>
        <div className="flex gap-1">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="rounded-md p-2 text-muted-foreground hover:text-foreground">
              <n.icon className="h-4 w-4" />
            </Link>
          ))}
        </div>
      </div>

      <main className="flex-1 overflow-x-hidden pt-16 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
