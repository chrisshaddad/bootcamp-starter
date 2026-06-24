import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { UIMessage } from 'ai';
import { chatRequestSchema, type ChatRequest } from '@repo/contracts';
import { ZodValidationPipe } from '../common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // Protected by the global AuthGuard (no @Public()), so the caller must have a session.
  @Post()
  async chat(
    @Body(new ZodValidationPipe(chatRequestSchema)) body: ChatRequest,
    @Res() res: Response,
  ): Promise<void> {
    // The schema validates the envelope; the AI SDK owns the full UIMessage shape.
    await this.chatService.streamChat(body.messages as UIMessage[], res);
  }
}
