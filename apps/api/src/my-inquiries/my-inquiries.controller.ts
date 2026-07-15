import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  clientInquiryCreateRequestSchema,
  clientInquiryStatusRequestSchema,
  inquiryListQuerySchema,
  inquiryReplyRequestSchema,
  type ClientInquiryCreateRequest,
  type ClientInquiryDetailResponse,
  type ClientInquiryListResponse,
  type ClientInquiryStatusRequest,
  type InquiryListQuery,
  type InquiryReplyRequest,
} from '@repo/contracts';
import type { User } from '@repo/db';
import { z } from 'zod';
import { CurrentUser, Roles } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import { MyInquiriesService } from './my-inquiries.service';

// Inquiry ids are UUIDs; reject malformed path params before they reach Prisma.
const inquiryIdSchema = z.uuid();

/**
 * The client's own inquiries. The global AuthGuard requires a valid session;
 * @Roles restricts to CLIENT. Every handler scopes its work to the session
 * client (see the service) — a client only ever touches their own inquiries.
 */
@Controller('my/inquiries')
@Roles('CLIENT')
export class MyInquiriesController {
  constructor(private readonly myInquiries: MyInquiriesService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(inquiryListQuerySchema))
    query: InquiryListQuery,
    @CurrentUser() actor: User,
  ): Promise<ClientInquiryListResponse> {
    return this.myInquiries.list(query.status, actor);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(clientInquiryCreateRequestSchema))
    body: ClientInquiryCreateRequest,
    @CurrentUser() actor: User,
  ): Promise<ClientInquiryDetailResponse> {
    return this.myInquiries.create(body, actor);
  }

  @Get(':id')
  detail(
    @Param('id', new ZodValidationPipe(inquiryIdSchema)) id: string,
    @CurrentUser() actor: User,
  ): Promise<ClientInquiryDetailResponse> {
    return this.myInquiries.detail(id, actor);
  }

  @Post(':id/messages')
  sendMessage(
    @Param('id', new ZodValidationPipe(inquiryIdSchema)) id: string,
    @Body(new ZodValidationPipe(inquiryReplyRequestSchema))
    body: InquiryReplyRequest,
    @CurrentUser() actor: User,
  ): Promise<ClientInquiryDetailResponse> {
    return this.myInquiries.sendMessage(id, body, actor);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', new ZodValidationPipe(inquiryIdSchema)) id: string,
    @Body(new ZodValidationPipe(clientInquiryStatusRequestSchema))
    body: ClientInquiryStatusRequest,
    @CurrentUser() actor: User,
  ): Promise<ClientInquiryDetailResponse> {
    return this.myInquiries.updateStatus(id, body, actor);
  }
}
