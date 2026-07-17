'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Send, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useChat } from '@/hooks/use-chat';
import { useUser } from '@/hooks/use-auth';
import { Markdown } from '@/components/chat/markdown';
import type { UserResponse } from '@repo/contracts';

// Starter prompts shown on the empty state, tailored per role so they match
// what that user can actually do (and, for roles the assistant can pull live
// data for, lead with a data-backed question). Keep each set to what its role
// is permitted — e.g. only data-tool roles get a "summarize my stats" prompt.
const SUGGESTIONS_BY_ROLE: Record<UserResponse['role'], string[]> = {
  SUPER_ADMIN: [
    'Summarize the platform stats.',
    'What does catalog and barcode coverage mean?',
    'How do I add a new pharmacy?',
  ],
  PHARMACY_ADMIN: [
    'Summarize my pharmacy dashboard.',
    'Which branch has the most open inquiries?',
    'How do I invite an employee?',
  ],
  PHARMACY_MANAGER: [
    'How many low-stock medicines does my branch have?',
    'What counts as a near-expiry batch?',
    'Show my branch’s open inquiries.',
  ],
  PHARMACY_EMPLOYEE: [
    'Summarize my branch dashboard.',
    'What does the “pending” inquiry status mean?',
    'How do I update stock for a medicine?',
  ],
  STOCK_MANAGER: [
    'How do I add a new stock batch?',
    'What counts as low stock or near-expiry?',
    'How do I update a medicine’s quantity?',
  ],
  INQUIRY_OFFICER: [
    'How do I respond to a client inquiry?',
    'What do the inquiry statuses mean?',
    'How do I close an inquiry?',
  ],
  CLIENT: [
    'How do I ask a pharmacy about a medicine?',
    'How do I find a pharmacy near me?',
    'What does my inquiry status mean?',
  ],
};

// Shown while the role is still loading, or for an unexpected role.
const DEFAULT_SUGGESTIONS = [
  'What can this assistant help me with?',
  'Explain the roles and statuses on MedFind.',
  'How do I get started?',
];

function suggestionsFor(role: UserResponse['role'] | undefined): string[] {
  return (role && SUGGESTIONS_BY_ROLE[role]) ?? DEFAULT_SUGGESTIONS;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, isLoading, sendMessage } = useChat();
  // The widget only renders in the authenticated layout, so the user is present;
  // skip the redirect-on-401 effect so the layout owns that behavior, not us.
  const { user } = useUser({ redirectOnUnauthenticated: false });
  const suggestions = suggestionsFor(user?.role);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  // Dismiss on a click/tap outside the panel or on Escape. The listener is only
  // attached while open, and it's registered in an effect (after the click that
  // opened the panel has finished propagating), so opening never immediately
  // re-closes it.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // Scroll behavior differs by what just changed:
  // - You send a message (or the assistant is thinking) → jump to the bottom so
  //   your message and the "Thinking…" indicator are visible.
  // - The assistant's reply lands → bring the START of that reply to the top, so
  //   a long answer is read from the beginning instead of dropping you at its
  //   end. (scrollTo clamps at max scroll, so short replies just show in full.)
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const last = messages[messages.length - 1];

    if (!isLoading && last?.role === 'assistant' && lastMessageRef.current) {
      const target =
        container.scrollTop +
        (lastMessageRef.current.getBoundingClientRect().top -
          container.getBoundingClientRect().top) -
        12;
      container.scrollTo({ top: target, behavior: 'smooth' });
    } else {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Focus the input when the panel opens.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const submit = (value: string) => {
    if (!value.trim() || isLoading) return;
    void sendMessage(value);
    setInput('');
  };

  // Both the launcher and the panel stay mounted so each transition (open AND
  // close) can play; `open` just cross-fades/scales between them. `inert` pulls
  // the hidden one out of the tab order and blocks its pointer events.
  return (
    <>
      <Button
        type="button"
        size="icon"
        aria-label="Open the MedFind assistant"
        onClick={() => setOpen(true)}
        inert={open}
        className={cn(
          'fixed bottom-6 right-6 z-50 size-14 rounded-full shadow-lg transition-all duration-200 ease-out',
          open ? 'scale-0 opacity-0' : 'scale-100 opacity-100',
        )}
      >
        <Sparkles className="size-6" />
      </Button>

      <div
        ref={panelRef}
        inert={!open}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex h-[32rem] max-h-[calc(100svh-3rem)] w-[min(24rem,calc(100vw-3rem))] origin-bottom-right flex-col overflow-hidden rounded-xl border border-gray-300 bg-white shadow-2xl transition-all duration-200 ease-out',
          open
            ? 'translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none translate-y-2 scale-95 opacity-0',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-primary-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary-base" />
            <div className="leading-tight">
              <p className="text-sm font-semibold text-gray-900">
                MedFind Assistant
              </p>
              <p className="text-xs text-gray-600">
                Here to help you use the app
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Close the assistant"
            onClick={() => setOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Messages — min-h-0 lets this flex child shrink and scroll internally
            instead of pushing the composer out of the fixed-height panel. */}
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-gray-400"
        >
          {messages.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Ask me about any page, feature, or your own metrics on MedFind.
              </p>
              <div className="flex flex-col gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => submit(suggestion)}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:border-primary-base hover:text-gray-900"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) =>
              message.role === 'user' ? (
                <div
                  key={index}
                  ref={
                    index === messages.length - 1 ? lastMessageRef : undefined
                  }
                  className="flex justify-end"
                >
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary-base px-3 py-2 text-sm text-white">
                    {message.content}
                  </div>
                </div>
              ) : (
                <div
                  key={index}
                  ref={
                    index === messages.length - 1 ? lastMessageRef : undefined
                  }
                  className="flex justify-start gap-2"
                >
                  <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-100">
                    <Sparkles className="size-3.5 text-primary-base" />
                  </div>
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-100 px-3 py-2 text-sm text-gray-800">
                    <Markdown>{message.content}</Markdown>
                  </div>
                </div>
              ),
            )
          )}

          {isLoading && (
            <div className="flex justify-start gap-2">
              <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-100">
                <Sparkles className="size-3.5 text-primary-base" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-gray-100 px-3 py-2 text-sm text-gray-500">
                <Loader2 className="size-4 animate-spin" />
                Thinking…
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit(input);
          }}
          className="flex items-center gap-2 border-t border-gray-200 p-3"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask a question…"
            maxLength={4000}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Send message"
            disabled={isLoading || !input.trim()}
          >
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </>
  );
}
