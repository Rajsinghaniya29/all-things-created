import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Flame, Target, Sparkles, Plus, TrendingUp, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type Task = {
  id: string;
  title: string;
  description: string | null;
  scheduled_date: string | null;
  priority: string;
  completed: boolean;
  goal_id: string | null;
  estimated_minutes: number | null;
};

function formatDayLabel(dateStr: string | null, todayStr: string) {
  if (!dateStr) return "Anytime";
  const today = new Date(todayStr + "T00:00:00");
  const d = new Date(dateStr + "T00:00:00");
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 0) return `Overdue · ${d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}`;
  if (diff < 7) return d.toLocaleDateString(undefined, { weekday: "long" });
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function Dashboard() {
  const { user } = useAuth();
  const userId = user?.id;
  const today = new Date().toISOString().slice(0, 10);

  const goalsQ = useQuery({
    queryKey: ["goals", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const tasksQ = useQuery({
    queryKey: ["tasks-all", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id,title,description,scheduled_date,priority,completed,goal_id,estimated_minutes")
        .order("scheduled_date", { ascending: true, nullsFirst: false })
        .order("priority", { ascending: false });
      if (error) throw error;
      return data as Task[];
    },
  });

  const recsQ = useQuery({
    queryKey: ["recs", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_recommendations")
        .select("*")
        .eq("dismissed", false)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  async function toggleTask(id: string, completed: boolean) {
    await supabase
      .from("tasks")
      .update({ completed: !completed, completed_at: !completed ? new Date().toISOString() : null })
      .eq("id", id);
    tasksQ.refetch();

    const task = tasksQ.data?.find((t) => t.id === id);
    if (task?.goal_id) {
      const { data: all } = await supabase.from("tasks").select("id, completed").eq("goal_id", task.goal_id);
      if (all && all.length) {
        const done = all.filter((t) => (t.id === id ? !completed : t.completed)).length;
        const pct = Math.round((done / all.length) * 100);
        await supabase.from("goals").update({ progress: pct, status: pct >= 100 ? "completed" : "active" }).eq("id", task.goal_id);
        goalsQ.refetch();
      }
    }
  }

  const tasks = tasksQ.data ?? [];
  const remaining = tasks.filter((t) => !t.completed);
  const todayTasks = remaining.filter((t) => t.scheduled_date === today || !t.scheduled_date);
  const upcoming = remaining.filter((t) => t.scheduled_date && t.scheduled_date > today);
  const overdue = remaining.filter((t) => t.scheduled_date && t.scheduled_date < today);

  // Group upcoming by date
  const grouped = new Map<string, Task[]>();
  for (const t of upcoming) {
    const k = t.scheduled_date!;
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k)!.push(t);
  }
  const upcomingDays = Array.from(grouped.entries()).slice(0, 7);

  const totalTasks = tasks.length;
  const doneTotal = tasks.filter((t) => t.completed).length;
  const activeGoals = goalsQ.data?.filter((g) => g.status === "active").length ?? 0;
  const avgProgress = goalsQ.data?.length
    ? Math.round(goalsQ.data.reduce((s, g) => s + (g.progress ?? 0), 0) / goalsQ.data.length)
    : 0;

  function TaskRow({ t }: { t: Task }) {
    return (
      <li className="group flex items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-sidebar-accent/40">
        <button onClick={() => toggleTask(t.id, t.completed)} className="mt-0.5">
          {t.completed
            ? <CheckCircle2 className="h-5 w-5 text-[var(--mint)]" />
            : <Circle className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />}
        </button>
        <div className="flex-1">
          <div className={`text-sm ${t.completed ? "text-muted-foreground line-through" : ""}`}>{t.title}</div>
          {t.description && <div className="text-xs text-muted-foreground">{t.description}</div>}
          {t.estimated_minutes ? (
            <div className="mt-1 text-[10px] text-muted-foreground">~{t.estimated_minutes} min</div>
          ) : null}
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
          t.priority === "high" ? "bg-destructive/20 text-destructive" :
          t.priority === "low" ? "bg-muted text-muted-foreground" :
          "bg-[var(--mint)]/15 text-[var(--mint)]"
        }`}>{t.priority}</span>
      </li>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:px-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <h1 className="font-display text-3xl font-bold">Your action dashboard</h1>
        </div>
        <Link to="/planner">
          <Button variant="hero" size="lg"><Sparkles className="h-4 w-4" /> New AI plan</Button>
        </Link>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Active goals", value: activeGoals, icon: Target },
          { label: "Tasks remaining", value: remaining.length, icon: Circle },
          { label: "Completed", value: `${doneTotal}/${totalTasks}`, icon: CheckCircle2 },
          { label: "Avg progress", value: `${avgProgress}%`, icon: TrendingUp },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-2xl p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <s.icon className="h-4 w-4 text-[var(--mint)]" />
            </div>
            <div className="mt-2 font-display text-2xl font-bold">{s.value}</div>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Overdue */}
          {overdue.length > 0 && (
            <div className="glass rounded-2xl border border-destructive/30 p-6">
              <div className="mb-3 flex items-center gap-2">
                <Flame className="h-4 w-4 text-destructive" />
                <h2 className="font-display text-lg font-semibold">Overdue ({overdue.length})</h2>
              </div>
              <ul className="space-y-1">
                {overdue.map((t) => <TaskRow key={t.id} t={t} />)}
              </ul>
            </div>
          )}

          {/* Today */}
          <div className="glass rounded-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Today</h2>
              <span className="text-xs text-muted-foreground">{todayTasks.length} to do</span>
            </div>
            {tasksQ.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !todayTasks.length ? (
              <div className="rounded-xl border border-dashed border-border/60 p-8 text-center">
                <p className="text-sm text-muted-foreground">Nothing left for today. Nice work.</p>
                <Link to="/planner"><Button variant="outline" size="sm" className="mt-3"><Plus className="h-4 w-4" /> Plan something new</Button></Link>
              </div>
            ) : (
              <ul className="space-y-1">
                {todayTasks.map((t) => <TaskRow key={t.id} t={t} />)}
              </ul>
            )}
          </div>

          {/* Upcoming grouped by day */}
          {upcomingDays.length > 0 && (
            <div className="glass rounded-2xl p-6">
              <div className="mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[var(--mint)]" />
                <h2 className="font-display text-lg font-semibold">Upcoming days</h2>
              </div>
              <div className="space-y-5">
                {upcomingDays.map(([date, items]) => (
                  <div key={date}>
                    <div className="mb-1 flex items-baseline justify-between">
                      <h3 className="text-sm font-medium text-foreground">{formatDayLabel(date, today)}</h3>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{date}</span>
                    </div>
                    <ul className="space-y-1">
                      {items.map((t) => <TaskRow key={t.id} t={t} />)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="glass rounded-2xl p-6">
            <h2 className="font-display mb-4 text-lg font-semibold">Active goals</h2>
            {!goalsQ.data?.length ? (
              <p className="text-sm text-muted-foreground">No goals yet. Drop a thought into the AI Planner.</p>
            ) : (
              <ul className="space-y-4">
                {goalsQ.data.slice(0, 4).map((g) => (
                  <li key={g.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{g.title}</span>
                      <span className="text-xs text-muted-foreground">{g.progress}%</span>
                    </div>
                    <Progress value={g.progress} className="h-1.5" />
                    {g.category && <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{g.category}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="glass rounded-2xl p-6">
            <h2 className="font-display mb-3 text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--mint)]" /> AI insights
            </h2>
            {!recsQ.data?.length ? (
              <p className="text-sm text-muted-foreground">Insights will appear here as you build plans.</p>
            ) : (
              <ul className="space-y-3">
                {recsQ.data.map((r) => (
                  <li key={r.id} className="rounded-lg border border-border/40 bg-background/30 p-3">
                    {r.title && <div className="text-xs font-medium text-[var(--mint)]">{r.title}</div>}
                    <div className="mt-1 text-sm text-muted-foreground">{r.content}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
