import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import {
  chatMessageRequestSwaggerSchema,
  chatMessageResponseSwaggerSchema,
} from './chat.swagger';
import { CurrentUser } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import { chatMessageRequestSchema } from '@repo/contracts';
import type { ChatMessageRequest, ChatMessageResponse } from '@repo/contracts';
import type { User } from '@repo/db';

@ApiTags('chat')
@ApiCookieAuth('session-cookie')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /** Send a message to the AI chat assistant */
  @Post('message')
  @HttpCode(201)
  @ApiOperation({ summary: 'Send a message to the AI assistant' })
  @ApiBody({ schema: chatMessageRequestSwaggerSchema })
  @ApiResponse({
    status: 201,
    description: 'The response from the AI assistant',
    schema: chatMessageResponseSwaggerSchema,
  })
  async sendMessage(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(chatMessageRequestSchema))
    body: ChatMessageRequest,
  ): Promise<ChatMessageResponse> {
    return this.chatService.sendMessage(
      body.message,
      user.gymId,
      user.id,
      user.role,
    );
  }
}
