import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { generateRoadmap } from "@/lib/planner.functions";

export const Route = createFileRoute("/_authenticated/planner")({
  component: PlannerPage,
});

const EXAMPLES = [
  "I want to become a software engineer in 6 months.",
  "I feel scattered with my studies — help me focus.",
  "Launch a side-project SaaS in 90 days.",
  "Improve my fitness, sleep and energy.",
];

function PlannerPage() {
  const [thought, setThought] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const run = useServerFn(generateRoadmap);

  async function go() {
    if (thought.trim().length < 5) {
      toast.error("Tell me a little more about your idea or goal.");
      return;
    }
    setBusy(true);
    try {
      const res = await run({ data: { thought } });
      toast.success("Your roadmap is ready.");
      if (res.insight) toast(res.insight);
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12 md:px-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-[var(--mint)]" /> AI Planner
        </div>
        <h1 className="font-display text-4xl font-bold">What's on your mind?</h1>
        <p className="mt-2 text-muted-foreground">
          Type any thought, dream, goal or struggle. The AI will return a full execution roadmap —
          milestones, tasks, schedule.
        </p>
      </motion.div>

      <div className="glass-strong mt-8 rounded-3xl p-2 shadow-card">
        <Textarea
          value={thought}
          onChange={(e) => setThought(e.target.value)}
          placeholder="e.g. I want to build a startup that helps students manage stress…"
          className="min-h-[140px] resize-none border-0 bg-transparent text-base focus-visible:ring-0"
        />
        <div className="flex items-center justify-between gap-3 border-t border-border/40 px-3 py-3">
          <div className="text-xs text-muted-foreground">{thought.length} chars</div>
          <Button variant="hero" size="lg" onClick={go} disabled={busy}>
            <Wand2 className="h-4 w-4" /> {busy ? "Generating your roadmap…" : "Generate roadmap"}
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Try one</div>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setThought(ex)}
              className="rounded-full glass px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:ring-mint"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
