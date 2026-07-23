'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@/hooks/use-chat';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  MessageCircle,
  X,
  Sparkles,
  Send,
  Trash2,
  AlertCircle,
} from 'lucide-react';

const SUGGESTIONS = [
  'How many active members?',
  "Show today's check-ins",
  'What sessions are coming up?',
  'Any expiring subscriptions?',
];

/** Escapes HTML first — the reply may come from an LLM, never trust it as markup */
function formatChatReply(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .replace(/^#{1,6} (.*)$/gm, '<strong>$1</strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- /gm, '• ')
    .replace(/\n/g, '<br />');
}

/** Floating chat widget for the gym's AI assistant, mounted globally on every authenticated page */
export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, sendMessage, clearChat } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 flex h-125 w-95 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="flex items-center gap-2 text-primary-base">
              <Sparkles className="h-5 w-5" />
              <span className="font-semibold text-foreground">
                GymCloud Assistant
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={clearChat}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Clear chat"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto bg-background p-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex max-w-[80%] flex-col ${
                  msg.role === 'user'
                    ? 'self-end items-end'
                    : 'self-start items-start'
                }`}
              >
                <div
                  className={`rounded-2xl px-4 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'rounded-tr-sm bg-primary-base text-primary-foreground'
                      : 'rounded-tl-sm bg-muted text-foreground'
                  }`}
                >
                  {msg.isLoading ? (
                    <div className="flex h-5 items-center gap-1">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-foreground/40 [animation-delay:-0.3s]" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-foreground/40 [animation-delay:-0.15s]" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-foreground/40" />
                    </div>
                  ) : msg.isError ? (
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  ) : msg.role === 'assistant' ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: formatChatReply(msg.content),
                      }}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>
              </div>
            ))}
            {messages.length <= 1 && (
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => sendMessage(s)}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:border-primary-base hover:text-primary-base"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex flex-col gap-1 border-t border-border p-3">
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything..."
                className="max-h-30 min-h-10 flex-1 resize-none rounded-lg border-border px-3 py-2 text-sm focus-visible:ring-1 focus-visible:ring-primary-base"
                rows={1}
                maxLength={2000}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim()}
                size="icon"
                className="h-10 w-10 shrink-0 rounded-full bg-primary-base text-primary-foreground hover:bg-primary-base/90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {input.length > 0 && (
              <div className="px-1 text-right text-[10px] text-muted-foreground">
                {input.length}/2000
              </div>
            )}
          </div>
        </div>
      )}

      <Button
        onClick={() => setIsOpen((prev) => !prev)}
        className="h-14 w-14 rounded-full bg-primary-base text-primary-foreground shadow-lg transition-transform hover:scale-105 hover:bg-primary-base/90"
        aria-label="Toggle chat"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </Button>
    </div>
  );
}
