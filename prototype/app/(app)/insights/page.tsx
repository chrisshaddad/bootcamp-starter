"use client";

import { useEffect, useRef, useState } from "react";
import { Info, Send, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { computeMetrics } from "@/lib/metrics";
import {
  AI_ACTIONS,
  generateInsight,
  type AiActionKey,
  type ChipTone,
  type Insight,
} from "@/lib/ai";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Msg {
  id: string;
  role: "user" | "assistant";
  text?: string;
  insight?: Insight;
}

const CHIP_TONE: Record<ChipTone, string> = {
  primary: "bg-primary-soft text-primary-300",
  accent: "bg-accent-base/10 text-accent-base",
  success: "bg-success/12 text-success",
  warning: "bg-warning/12 text-warning",
  error: "bg-error/12 text-error",
};

function InsightView({ insight }: { insight: Insight }) {
  return (
    <div className="space-y-3">
      <p className="font-medium text-foreground">{insight.headline}</p>
      {insight.figures.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {insight.figures.map((f, i) => (
            <span
              key={i}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs",
                CHIP_TONE[f.tone ?? "primary"],
              )}
            >
              <span className="opacity-80">{f.label}</span>
              <span className="font-semibold tabular-nums">{f.value}</span>
            </span>
          ))}
        </div>
      )}
      <p className="text-sm text-muted-foreground">{insight.body}</p>
      <div className="rounded-lg border border-primary-base/20 bg-primary-soft/40 px-3 py-2.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-primary-300">
          Suggested action
        </p>
        <p className="mt-1 text-sm text-foreground">{insight.action}</p>
      </div>
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        {insight.caveat}
      </p>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-bounce rounded-full bg-muted-foreground"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

function Assistant({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Sparkles className="size-4" />
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm border-l-2 border-primary-base bg-background/40 px-4 py-3">
        {children}
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const { orgData } = useStore();
  const idRef = useRef(1);
  const nextId = () => `m${idRef.current++}`;
  const endRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "intro",
      role: "assistant",
      text: "Hi — I've analyzed your latest numbers. Pick a question below, and I'll point you to a specific figure with a suggested action.",
    },
  ]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  if (!orgData) return null;
  const metrics = computeMetrics(orgData);

  const respond = (produce: () => Msg) => {
    setTyping(true);
    window.setTimeout(() => {
      setMessages((prev) => [...prev, produce()]);
      setTyping(false);
    }, 650);
  };

  const ask = (action: AiActionKey, question: string) => {
    if (typing) return;
    setMessages((prev) => [...prev, { id: nextId(), role: "user", text: question }]);
    respond(() => ({
      id: nextId(),
      role: "assistant",
      insight: generateInsight(action, metrics),
    }));
  };

  const submitFree = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || typing) return;
    setInput("");
    setMessages((prev) => [...prev, { id: nextId(), role: "user", text }]);
    respond(() => ({
      id: nextId(),
      role: "assistant",
      text: "In the prototype I answer the suggested questions below — pick one to see an insight tied to your real numbers.",
    }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Insights"
        description="Recommendations tied to your real numbers — never generic advice."
      />

      <div className="flex h-[calc(100vh-13rem)] min-h-[28rem] flex-col overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">
                  {m.text}
                </div>
              </div>
            ) : (
              <Assistant key={m.id}>
                {m.insight ? (
                  <InsightView insight={m.insight} />
                ) : (
                  <p className="text-sm text-foreground">{m.text}</p>
                )}
              </Assistant>
            ),
          )}
          {typing && (
            <Assistant>
              <TypingDots />
            </Assistant>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-border p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {AI_ACTIONS.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() => ask(a.key, a.question)}
                disabled={typing}
                className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary-base/50 hover:bg-primary-soft disabled:opacity-50"
              >
                {a.label}
              </button>
            ))}
          </div>
          <form onSubmit={submitFree} className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your sales or expenses…"
            />
            <Button type="submit" size="icon" disabled={typing || !input.trim()}>
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
