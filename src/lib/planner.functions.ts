import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway";

// Permissive schema — we normalize after the model returns.
const TaskSchema = z.object({
  title: z.string(),
  description: z.string().optional().default(""),
  scheduled_date: z.string().optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
  estimated_minutes: z.number().int().optional().default(30),
});

const MilestoneSchema = z.object({
  title: z.string(),
  description: z.string().optional().default(""),
  due_date: z.string().optional().nullable(),
  tasks: z.array(TaskSchema).optional().default([]),
});

const RoadmapSchema = z.object({
  goal: z.object({
    title: z.string(),
    description: z.string().optional().default(""),
    category: z.string().optional().default("General"),
    target_date: z.string().optional().nullable(),
  }),
  milestones: z.array(MilestoneSchema).optional().default([]),
  insight: z.string().optional().default(""),
});

const isYmd = (s: unknown): s is string =>
  typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

function extractJson(raw: string): string {
  let s = raw.trim();
  // strip ```json ... ``` fences
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  // find first { and last }
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) throw new Error("No JSON object in response");
  s = s.substring(start, end + 1);
  // remove trailing commas
  s = s.replace(/,(\s*[}\]])/g, "$1");
  return s;
}

export const generateRoadmap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ thought: z.string().min(5).max(2000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const gateway = createLovableAiGatewayProvider(apiKey);
    const today = new Date().toISOString().slice(0, 10);

    const system = `You are an elite AI coach + project planner. Transform a user's raw thought, dream, or struggle into a complete actionable execution roadmap.

Return ONLY a single JSON object (no markdown, no commentary) with EXACTLY this shape:
{
  "goal": {
    "title": "string (max 80 chars)",
    "description": "1-2 sentence summary",
    "category": "Career | Health | Learning | Startup | Mindset | etc.",
    "target_date": "YYYY-MM-DD or null"
  },
  "milestones": [
    {
      "title": "string",
      "description": "string",
      "due_date": "YYYY-MM-DD or null",
      "tasks": [
        {
          "title": "string",
          "description": "string",
          "scheduled_date": "YYYY-MM-DD or null",
          "priority": "low|medium|high",
          "estimated_minutes": 30
        }
      ]
    }
  ],
  "insight": "empathetic insight (max 200 chars)"
}

Rules:
- 3 to 6 milestones, each with 2 to 6 tasks.
- Dates MUST be in YYYY-MM-DD format. Today is ${today}. Use null when uncertain.
- Tasks must be specific, measurable, and time-boxed.
- Warm, motivating language. No platitudes.
- Output JSON only.`;

    const prompt = `User's thought:\n"""${data.thought}"""\n\nReturn the JSON roadmap now.`;

    const candidates = [
      "google/gemini-2.5-flash",
      "google/gemini-3-flash-preview",
      "openai/gpt-5-mini",
    ];

    let parsed: z.infer<typeof RoadmapSchema> | null = null;
    let lastErr: unknown = null;

    for (const m of candidates) {
      try {
        const { text } = await generateText({
          model: gateway(m),
          system,
          prompt,
        });
        const jsonStr = extractJson(text);
        const json = JSON.parse(jsonStr);
        parsed = RoadmapSchema.parse(json);
        break;
      } catch (e) {
        lastErr = e;
        console.error(`[planner] model ${m} failed:`, e instanceof Error ? e.message : e);
      }
    }

    if (!parsed) {
      const msg = lastErr instanceof Error ? lastErr.message : "Unknown error";
      throw new Error(`Roadmap generation failed: ${msg}`);
    }

    const object = parsed;
    const { supabase, userId } = context;

    const { data: goal, error: goalErr } = await supabase
      .from("goals")
      .insert({
        user_id: userId,
        raw_thought: data.thought,
        title: object.goal.title.slice(0, 200),
        description: object.goal.description ?? null,
        category: object.goal.category ?? null,
        target_date: isYmd(object.goal.target_date) ? object.goal.target_date : null,
      })
      .select()
      .single();
    if (goalErr || !goal) throw new Error(goalErr?.message ?? "Failed to create goal");

    for (let i = 0; i < object.milestones.length; i++) {
      const m = object.milestones[i];
      const { data: ms, error: msErr } = await supabase
        .from("milestones")
        .insert({
          goal_id: goal.id,
          user_id: userId,
          title: m.title,
          description: m.description ?? null,
          due_date: isYmd(m.due_date) ? m.due_date : null,
          order_index: i,
        })
        .select()
        .single();
      if (msErr || !ms) continue;

      const tasksRows = (m.tasks ?? []).map((t) => ({
        user_id: userId,
        goal_id: goal.id,
        milestone_id: ms.id,
        title: t.title,
        description: t.description ?? null,
        scheduled_date: isYmd(t.scheduled_date) ? t.scheduled_date : null,
        priority: t.priority ?? "medium",
        estimated_minutes: Math.max(5, Math.min(480, t.estimated_minutes ?? 30)),
      }));
      if (tasksRows.length) {
        await supabase.from("tasks").insert(tasksRows);
      }
    }

    if (object.insight) {
      await supabase.from("ai_recommendations").insert({
        user_id: userId,
        type: "insight",
        title: `On: ${object.goal.title}`.slice(0, 200),
        content: object.insight,
      });
    }

    return { goalId: goal.id, insight: object.insight };
  });
