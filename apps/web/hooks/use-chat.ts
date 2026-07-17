'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { apiPost, ApiError } from '@/lib/api';
import type { ChatMessage, ChatRequest, ChatResponse } from '@repo/contracts';

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  reset: () => void;
}

/**
 * Local state + POST /chat for the instructor assistant. The conversation lives
 * in component state (the API is stateless — the full visible history is resent
 * each turn); nothing is persisted across reloads. On failure the user's
 * message is kept and the error is surfaced via toast so they can retry.
 */
export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isLoading) return;

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
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : 'Something went wrong. Please try again.';
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading],
  );

  const reset = useCallback(() => setMessages([]), []);

  return { messages, isLoading, sendMessage, reset };
}
