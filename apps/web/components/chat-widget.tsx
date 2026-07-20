'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@/hooks/use-chat';
import { Button } from '@/components/ui/button';
import {
  MessageCircle,
  X,
  Sparkles,
  Send,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

const SUGGESTIONS = [
  '👥 How many active members?',
  "📊 Show today's check-ins",
  '📅 What sessions are coming up?',
  '⚠️ Any expiring subscriptions?',
  '💰 How many active plans?',
];

function formatChatMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- /gm, '• ')
    .replace(/\n/g, '<br />');
}

/**
 * Floating chat widget for the GymFlow Assistant
 */
export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, sendMessage, clearChat } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
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
        <div className="glass-card mb-4 w-[380px] h-[500px] flex flex-col rounded-xl overflow-hidden animate-scale-in shadow-2xl border border-border">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-card">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="w-5 h-5" />
              <span className="font-semibold text-foreground">
                GymFlow Assistant
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
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-background">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[80%] ${
                  msg.role === 'user'
                    ? 'self-end items-end'
                    : 'self-start items-start'
                }`}
              >
                <div
                  className={`px-4 py-2 rounded-2xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-muted text-foreground rounded-tl-sm'
                  }`}
                >
                  {msg.isLoading ? (
                    <div className="flex items-center gap-1 h-5">
                      <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" />
                    </div>
                  ) : msg.isError ? (
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  ) : msg.role === 'assistant' ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: formatChatMarkdown(msg.content),
                      }}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>
              </div>
            ))}
            {messages.length <= 2 && (
              <div className="flex flex-wrap gap-2 px-4 pb-3">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary-base hover:text-primary-base text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border bg-card flex flex-col gap-1">
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything..."
                className="min-h-[40px] max-h-[120px] resize-none flex-1 border-border focus:ring-1 focus:ring-primary rounded-lg py-2 px-3 text-sm"
                rows={1}
                maxLength={2000}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim()}
                size="icon"
                className="btn-gradient h-[40px] w-[40px] shrink-0 rounded-full"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            {input.length > 0 && (
              <div className="text-[10px] text-muted-foreground text-right px-1">
                {input.length}/2000
              </div>
            )}
          </div>
        </div>
      )}

      {/* FAB */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-gradient w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Toggle chat"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
      </Button>
    </div>
  );
}
