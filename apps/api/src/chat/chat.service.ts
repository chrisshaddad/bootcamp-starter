import { Injectable } from '@nestjs/common';
import type { Response } from 'express';
import { google } from '@ai-sdk/google';
import { convertToModelMessages, streamText, type UIMessage } from 'ai';

// Gemini 2.5 Flash: fast, free-tier friendly, supports tool calling (added later).
const CHAT_MODEL = 'gemini-2.5-flash';

const SYSTEM_PROMPT = `You are Margin's assistant for small business owners.
You help owners understand the profitability of their products and services in
plain, encouraging language. Keep answers concise and concrete.
You do not have access to the owner's data yet, so never invent numbers — if a
question needs figures you don't have, say so plainly and explain what you would
need to answer it.`;

@Injectable()
export class ChatService {
  /**
   * Streams a chat completion for the given conversation directly to the HTTP
   * response, using the AI SDK's UI message stream protocol that `useChat` expects.
   * The service owns the piping so the controller stays thin and the streamed
   * result type never crosses a public boundary (avoids a TS declaration-emit issue).
   */
  async streamChat(messages: UIMessage[], res: Response): Promise<void> {
    const result = streamText({
      model: google(CHAT_MODEL),
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
    });

    result.pipeUIMessageStreamToResponse(res);
  }
}
