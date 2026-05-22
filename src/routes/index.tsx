import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, Brain, Target, Calendar, MessageSquare, TrendingUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <nav className="container mx-auto flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--mint)] to-[var(--mint-glow)] shadow-glow">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">Thought<span className="text-gradient-mint">→</span>Action</span>
        </div>
        <div className="flex gap-2">
          <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
          <Link to="/login"><Button variant="hero" size="sm">Get started</Button></Link>
        </div>
      </nav>

      <section className="container mx-auto px-6 pt-16 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-[var(--mint)]" />
            Your thoughts → executable roadmaps, powered by AI
          </div>
          <h1 className="font-display mx-auto max-w-4xl text-5xl font-bold leading-tight tracking-tight md:text-7xl">
            Turn raw <span className="text-gradient-mint">thoughts</span> into a complete plan
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Drop in an idea, dream, or struggle. Get back goals, milestones, daily tasks,
            schedules, habits, and an AI coach that keeps you moving.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/login"><Button variant="hero" size="lg" className="animate-pulse-glow">Start free</Button></Link>
            <Link to="/login"><Button variant="outline" size="lg">See dashboard</Button></Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-20 grid gap-4 md:grid-cols-3"
        >
          {[
            { icon: Target, t: "Goal architect", d: "AI breaks any vision into clear milestones and tasks." },
            { icon: Calendar, t: "Smart schedules", d: "Daily & weekly plans, auto-balanced to your timeline." },
            { icon: MessageSquare, t: "AI coach chat", d: "An always-on assistant for motivation and re-planning." },
            { icon: TrendingUp, t: "Progress analytics", d: "Streaks, heatmaps and momentum tracking." },
            { icon: Zap, t: "Habit engine", d: "Daily check-ins build compounding routines." },
            { icon: Brain, t: "Emotion-aware", d: "Plans adapt to how you actually feel." },
          ].map((f, i) => (
            <motion.div
              key={f.t}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className="glass rounded-2xl p-6 text-left transition-all hover:ring-mint"
            >
              <f.icon className="h-6 w-6 text-[var(--mint)]" />
              <h3 className="mt-4 font-semibold">{f.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </div>
  );
}
