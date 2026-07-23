'use client';

import { useCallback, useState } from 'react';
import { apiPost, ApiError } from '@/lib/api';
import type {
  ChatMessage,
  ChatReferencedBook,
  ChatResponse,
} from '@repo/contracts';

export type DisplayChatMessage = ChatMessage & {
  referencedBooks?: ChatReferencedBook[];
};

/**
 * Session-only chat history - lives in React state, resent in full to the
 * stateless /portal/chat endpoint on every send. No persistence, no SWR.
 */
export function usePortalChat() {
  const [messages, setMessages] = useState<DisplayChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isSending) return;

      const userMessage: DisplayChatMessage = {
        role: 'user',
        content: trimmed,
      };
      const history = [...messages, userMessage];
      setMessages(history);
      setError(null);
      setIsSending(true);

      try {
        const res = await apiPost<ChatResponse>('/portal/chat', {
          messages: history.map(({ role, content }) => ({ role, content })),
        });
        setMessages((prev) => [
          ...prev,
          { ...res.message, referencedBooks: res.referencedBooks },
        ]);
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err
            : new ApiError(500, 'Something went wrong'),
        );
      } finally {
        setIsSending(false);
      }
    },
    [messages, isSending],
  );

  return { messages, isSending, error, sendMessage };
}
