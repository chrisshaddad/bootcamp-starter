'use client';

import { useState, useCallback } from 'react';
import { apiPost, ApiError } from '@/lib/api';
import type { ChatMessageResponse } from '@repo/contracts';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  isError?: boolean;
}

export interface UseChatReturn {
  messages: ChatMessage[];
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
}

/**
 * Hook to manage chat messages and interaction with the GymFlow Assistant
 */
export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I am the GymFlow Assistant. How can I help you today?',
      timestamp: new Date(),
    },
  ]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessageId = Math.random().toString(36).substring(7);
    const assistantMessageId = Math.random().toString(36).substring(7);

    const userMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    const loadingMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);

    try {
      const response = await apiPost<ChatMessageResponse>('/chat/message', {
        message: content,
      });

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: response.reply, isLoading: false }
            : msg
        )
      );
    } catch (error) {
      const errorMessage =
        error instanceof ApiError ? error.message : 'An error occurred. Please try again.';
      
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: errorMessage, isLoading: false, isError: true }
            : msg
        )
      );
    }
  }, []);

  const clearChat = useCallback(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Hello! I am the GymFlow Assistant. How can I help you today?',
        timestamp: new Date(),
      },
    ]);
  }, []);

  return { messages, sendMessage, clearChat };
}
