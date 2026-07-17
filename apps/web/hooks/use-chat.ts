'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { apiPost, ApiError } from '@/lib/api';
import type { ChatMessage, ChatRequest, ChatResponse } from '@repo/contracts';

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (content: string) => Promise<boolean>;
  reset: () => void;
}

/**
 * Local state + POST /chat for the instructor assistant. The conversation lives
 * in component state (the API is stateless — the full visible history is resent
 * each turn); nothing is persisted across reloads. On failure the optimistic
 * user message is rolled back (so a failed turn is never resent or duplicated)
 * and the error is surfaced via toast; sendMessage resolves to false so the
 * caller can restore the draft for a retry.
 */
export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(
    async (content: string): Promise<boolean> => {
      const trimmed = content.trim();
      if (!trimmed || isLoading) return false;

      const history: ChatMessage[] = [
        ...messages,
        { role: 'user', content: trimmed },
      ];
      setMessages(history);
      setIsLoading(true);

      try {
        const body: ChatRequest = { messages: history };
        const { reply } = await apiPost<ChatResponse>('/chat', body);
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
        return true;
      } catch (error) {
        // Roll the optimistic user message back out to the pre-send history so
        // a failed turn is never treated as complete (resent without a reply)
        // or duplicated on a retry. The caller keeps the draft for the retry.
        setMessages(messages);
        const message =
          error instanceof ApiError
            ? error.message
            : 'Something went wrong. Please try again.';
        toast.error(message);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading],
  );

  const reset = useCallback(() => setMessages([]), []);

  return { messages, isLoading, sendMessage, reset };
}
