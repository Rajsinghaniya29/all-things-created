import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatPage,
});

function ChatPage() {
  const { user } = useAuth();
  const [initial, setInitial] = useState<UIMessage[] | null>(null);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load history once, with auth headers
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setInitial([]); return; }
      const { data } = await supabase
        .from("chat_messages")
        .select("id, role, content, created_at")
        .order("created_at", { ascending: true })
        .limit(200);
      if (cancelled) return;
      const msgs: UIMessage[] = (data ?? []).map((m) => ({
        id: m.id,
        role: m.role as UIMessage["role"],
        parts: [{ type: "text", text: m.content }],
      }));
      setInitial(msgs);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const transport = useMemo(
    () => new DefaultChatTransport({
      api: "/api/chat",
      fetch: async (url, init) => {
        const { data: { session } } = await supabase.auth.getSession();
        const headers = new Headers(init?.headers);
        if (session) headers.set("Authorization", `Bearer ${session.access_token}`);
        return fetch(url, { ...init, headers });
      },
    }),
    [],
  );

  if (initial === null) {
    return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading conversation…</div>;
  }

  return <ChatInner initial={initial} transport={transport} input={input} setInput={setInput} scrollRef={scrollRef} textareaRef={textareaRef} />;
}

function ChatInner({
  initial, transport, input, setInput, scrollRef, textareaRef,
}: {
  initial: UIMessage[];
  transport: DefaultChatTransport<UIMessage>;
  input: string;
  setInput: (v: string) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const { messages, sendMessage, status } = useChat({
    id: "coach",
    messages: initial,
    transport,
  });

  const loading = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status, scrollRef]);

  useEffect(() => {
    if (!loading) textareaRef.current?.focus();
  }, [loading, textareaRef]);

  async function submit() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    await sendMessage({ text });
  }

  return (
    <div className="flex h-[100dvh] flex-col">
      <header className="border-b border-border/60 bg-sidebar/40 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[var(--mint)]" />
          <h1 className="font-display text-lg font-semibold">AI Coach</h1>
        </div>
        <p className="text-xs text-muted-foreground">Ask for motivation, replanning, or productivity advice.</p>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-6 md:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.length === 0 && (
            <div className="rounded-2xl glass p-8 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-[var(--mint)]" />
              <h2 className="font-display mt-3 text-xl font-semibold">Say hi to your coach</h2>
              <p className="mt-1 text-sm text-muted-foreground">Ask anything — I'll help you plan, focus, and follow through.</p>
            </div>
          )}
          {messages.map((m) => {
            const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
            return (
              <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
                {m.role === "user" ? (
                  <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-sm text-primary-foreground">
                    {text}
                  </div>
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none text-foreground prose-headings:font-display prose-strong:text-foreground prose-a:text-[var(--mint)]">
                    <ReactMarkdown>{text}</ReactMarkdown>
                  </div>
                )}
              </div>
            );
          })}
          {loading && (
            <div className="text-sm text-muted-foreground animate-pulse">Thinking…</div>
          )}
        </div>
      </div>

      <div className="border-t border-border/60 bg-sidebar/40 p-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <Textarea
            ref={textareaRef}
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
            }}
            placeholder="Message your coach…"
            className="min-h-[52px] max-h-40 resize-none rounded-2xl glass"
          />
          <Button variant="hero" size="icon" className="h-[52px] w-[52px] rounded-2xl" disabled={loading || !input.trim()} onClick={submit}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
