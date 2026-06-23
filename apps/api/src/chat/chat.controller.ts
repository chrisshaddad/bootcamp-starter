import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import type { UIMessage } from 'ai';
import { ZodValidationPipe } from '../common';
import { ChatService } from './chat.service';

// Light envelope check only — the AI SDK owns the full UIMessage shape.
const chatRequestSchema = z.object({
  messages: z.array(z.custom<UIMessage>()).min(1),
});

type ChatRequest = z.infer<typeof chatRequestSchema>;

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // Protected by the global AuthGuard (no @Public()), so the caller must have a session.
  @Post()
  async chat(
    @Body(new ZodValidationPipe(chatRequestSchema)) body: ChatRequest,
    @Res() res: Response,
  ): Promise<void> {
    await this.chatService.streamChat(body.messages, res);
  }
}
