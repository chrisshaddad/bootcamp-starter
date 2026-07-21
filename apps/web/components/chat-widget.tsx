'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useUser } from '@/hooks/use-auth';
import { usePortalChat } from '@/hooks/use-portal-chat';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { MessageCircle, Send, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const EXAMPLE_PROMPTS = [
  'Do you have any Andy Weir books?',
  "What's available in the sci-fi category?",
  'Recommend something short to read',
];

export function ChatWidget() {
  const { user } = useUser({ redirectOnUnauthenticated: false });
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const { messages, isSending, error, sendMessage } = usePortalChat();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, isSending]);

  useEffect(() => {
    if (!error) return;
    if (error.status !== 400 && error.status !== 503) {
      toast.error(error.message || 'Something went wrong');
    }
  }, [error]);

  if (user?.role !== 'MEMBER') return null;

  const handleSend = () => {
    if (!draft.trim() || isSending) return;
    void sendMessage(draft);
    setDraft('');
  };

  return (
    <>
      <Button
        type="button"
        size="icon"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-library-primary text-white shadow-lg hover:bg-library-ink"
        aria-label="Open NextShelf Assistant"
      >
        <MessageCircle className="size-6!" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex w-full flex-col p-0 sm:max-w-md">
          <SheetHeader className="border-b">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-library-primary" />
              NextShelf Assistant
            </SheetTitle>
          </SheetHeader>

          <div
            ref={listRef}
            className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
          >
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Hi! I can help you find books in this library&apos;s catalog.
                  Try asking:
                </p>
                <div className="space-y-2">
                  {EXAMPLE_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void sendMessage(prompt)}
                      className="block w-full rounded-md border px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message, i) => (
              <div
                key={i}
                className={cn(
                  'flex',
                  message.role === 'user' ? 'justify-end' : 'justify-start',
                )}
              >
                <div className="max-w-[85%] space-y-2">
                  <div
                    className={cn(
                      'whitespace-pre-wrap rounded-lg px-3 py-2 text-sm',
                      message.role === 'user'
                        ? 'bg-library-primary text-white'
                        : 'bg-muted text-foreground',
                    )}
                  >
                    {message.content}
                  </div>
                  {!!message.referencedBooks?.length && (
                    <div className="flex flex-wrap gap-1.5">
                      {message.referencedBooks.map((book) => (
                        <Link
                          key={book.id}
                          href={`/browse/${book.id}`}
                          onClick={() => setOpen(false)}
                          className="rounded-full border border-library-primary/30 bg-library-primary-100 px-2.5 py-1 text-xs text-library-primary-900 hover:bg-library-primary-200"
                        >
                          {book.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                  Thinking...
                </div>
              </div>
            )}

            {error && (error.status === 400 || error.status === 503) && (
              <div className="text-center text-sm text-error">
                {error.status === 400
                  ? error.message
                  : 'Chat is temporarily unavailable. Please try again later.'}
              </div>
            )}
          </div>

          <div className="border-t p-4">
            <div className="flex items-end gap-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask about the catalog..."
                className="min-h-9 resize-none"
                rows={1}
              />
              <Button
                type="button"
                size="icon"
                onClick={handleSend}
                disabled={!draft.trim() || isSending}
                className="shrink-0 bg-library-primary text-white hover:bg-library-ink"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
