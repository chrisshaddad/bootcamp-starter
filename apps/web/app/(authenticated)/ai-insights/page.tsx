'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles, Send, Info, Loader2, Check, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Preset "action chips" — tappable starter questions, each mapped to the
// read-only data tools the backend exposes (businessSummary, topNExpenses,
// listSales/listProducts, listGoals).
const SUGGESTIONS: { label: string; question: string }[] = [
  {
    label: "How's my business doing?",
    question:
      'How is my business doing this month? Give me a quick profitability summary.',
  },
  {
    label: 'Biggest expenses',
    question: 'What are my biggest expenses right now, and what stands out?',
  },
  {
    label: 'Top & weakest sellers',
    question:
      'Which of my products or services is selling best, and which is lagging?',
  },
  {
    label: 'Goal progress',
    question: 'Am I on track to hit my current goals?',
  },
];

// Friendly names for the tools the model calls, so the activity line reads
// like plain English instead of a function name.
const TOOL_LABELS: Record<string, string> = {
  businessSummary: 'your business summary',
  topNExpenses: 'your expenses',
  listProducts: 'your products',
  listSales: 'your sales',
  listGoals: 'your goals',
};

/** A tool part is `tool-<name>` (typed tool) or `dynamic-tool`. */
interface ToolPartLike {
  type: string;
  state?: string;
  toolName?: string;
}

function toolLabel(part: ToolPartLike): string {
  const name =
    part.type === 'dynamic-tool'
      ? (part.toolName ?? '')
      : part.type.replace(/^tool-/, '');
  return TOOL_LABELS[name] ?? 'your records';
}

// The model answers in markdown (bold figures, bullet lists). Tailwind's reset
// strips default element styling, and this app doesn't use the typography
// plugin, so each element the model realistically emits is styled explicitly.
const MARKDOWN_COMPONENTS = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-sm leading-relaxed text-foreground">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic">{children}</em>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
      {children}
    </ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal space-y-1 pl-5 text-sm text-foreground">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="rounded bg-secondary px-1 py-0.5 font-mono text-xs">
      {children}
    </code>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2"
    >
      {children}
    </a>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-sm font-semibold text-foreground">{children}</p>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-sm font-semibold text-foreground">{children}</p>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-sm font-semibold text-foreground">{children}</p>
  ),
};

function MarkdownText({ text }: { text: string }) {
  return (
    <div className="space-y-2">
      <Markdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
        {text}
      </Markdown>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-0.5">
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

function AssistantBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Sparkles className="size-4" />
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-border border-l-2 border-l-primary bg-background/50 px-4 py-3">
        {children}
      </div>
    </div>
  );
}

/** Renders one assistant message's ordered parts: prose text + tool activity. */
function AssistantMessage({ message }: { message: UIMessage }) {
  return (
    <AssistantBubble>
      <div className="space-y-2">
        {message.parts.map((part, i) => {
          if (part.type === 'text') {
            if (!part.text) return null;
            return <MarkdownText key={i} text={part.text} />;
          }

          if (part.type === 'dynamic-tool' || part.type.startsWith('tool-')) {
            const tool = part as ToolPartLike;
            const done = tool.state === 'output-available';
            const errored = tool.state === 'output-error';
            return (
              <span
                key={i}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 text-xs text-muted-foreground',
                  errored && 'text-destructive',
                )}
              >
                {errored ? (
                  <Info className="size-3" />
                ) : done ? (
                  <Check className="size-3 text-primary" />
                ) : (
                  <Loader2 className="size-3 animate-spin" />
                )}
                {errored
                  ? `Couldn't read ${toolLabel(tool)}`
                  : done
                    ? `Checked ${toolLabel(tool)}`
                    : `Reading ${toolLabel(tool)}…`}
              </span>
            );
          }

          return null;
        })}
      </div>
    </AssistantBubble>
  );
}

function UserMessage({ message }: { message: UIMessage }) {
  const text = message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('');
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">
        {text}
      </div>
    </div>
  );
}

export default function AiInsightsPage() {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${API_URL}/chat`,
        // Send the session cookie so the backend's AuthGuard can scope the
        // conversation to the caller's organization.
        credentials: 'include',
      }),
    [],
  );

  const { messages, sendMessage, status, error, stop } = useChat({ transport });

  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const busy = status === 'submitted' || status === 'streaming';
  // Show typing dots only while we're waiting for the model's first output.
  const waitingForReply =
    status === 'submitted' && messages.at(-1)?.role === 'user';

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, waitingForReply]);

  const ask = (text: string) => {
    if (busy || !text.trim()) return;
    void sendMessage({ text });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    ask(text);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI Insights</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask about your sales, expenses, products, and goals — answers are tied
          to your real numbers, never generic advice.
        </p>
      </div>

      <div className="flex h-[calc(100vh-14rem)] min-h-[28rem] flex-col overflow-hidden rounded-xl border border-border bg-card">
        {/* Messages */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {messages.length === 0 ? (
            <AssistantBubble>
              <p className="text-sm leading-relaxed text-foreground">
                Hi — I can look up your latest numbers and help you understand
                what&apos;s driving your profit. Pick a question below, or ask
                me anything about your sales, expenses, or goals.
              </p>
            </AssistantBubble>
          ) : (
            messages.map((m) =>
              m.role === 'user' ? (
                <UserMessage key={m.id} message={m} />
              ) : (
                <AssistantMessage key={m.id} message={m} />
              ),
            )
          )}

          {waitingForReply && (
            <AssistantBubble>
              <TypingDots />
            </AssistantBubble>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs text-destructive">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              <span>
                Something went wrong reaching the assistant. Check that the API
                is running and a Gemini API key is configured, then try again.
              </span>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Composer */}
        <div className="border-t border-border p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => ask(s.question)}
                disabled={busy}
                className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 disabled:opacity-50"
              >
                {s.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your sales, expenses, or goals…"
              disabled={busy}
            />
            {busy ? (
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => stop()}
                aria-label="Stop generating"
              >
                <Square className="size-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim()}
                aria-label="Send message"
              >
                <Send className="size-4" />
              </Button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
