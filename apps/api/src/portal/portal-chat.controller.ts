import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { ChatService } from '../chat/chat.service';
import { Roles, ActiveOrganizationId } from '../auth/decorators';
import {
  chatRequestSchema,
  type ChatRequest,
  type ChatResponse,
} from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';

@Controller('portal/chat')
@Roles('MEMBER')
export class PortalChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async chat(
    @ActiveOrganizationId() activeOrganizationId: string | null,
    @Body(new ZodValidationPipe(chatRequestSchema)) body: ChatRequest,
  ): Promise<ChatResponse> {
    return this.chatService.chat(
      this.requireActiveOrganization(activeOrganizationId),
      body,
    );
  }

  // Every portal controller resolves org from @ActiveOrganizationId(), not
  // @CurrentUser().organizationId (which is null for MEMBER). A patron who
  // hasn't activated a library yet gets a clear 400, not an unscoped query.
  private requireActiveOrganization(
    activeOrganizationId: string | null,
  ): string {
    if (!activeOrganizationId) {
      throw new BadRequestException('Select a library first');
    }
    return activeOrganizationId;
  }
}
