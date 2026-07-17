import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  chatRequestSchema,
  type ChatRequest,
  type ChatResponse,
} from '@repo/contracts';
import type { User } from '@repo/db';
import { CurrentUser } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import { ChatService } from './chat.service';

// The in-app instructor assistant. The global AuthGuard requires a valid
// session; there is no @Roles guard because every authenticated user may ask
// for help. All data access is scoped to the session actor inside the service,
// never to anything in the request body.
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  chat(
    @CurrentUser() actor: User,
    @Body(new ZodValidationPipe(chatRequestSchema)) body: ChatRequest,
  ): Promise<ChatResponse> {
    return this.chatService.chat(actor, body.messages);
  }
}
