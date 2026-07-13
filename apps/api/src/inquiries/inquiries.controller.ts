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
  inquiryListQuerySchema,
  inquiryReplyRequestSchema,
  inquiryStatusUpdateRequestSchema,
  type InquiryDetailResponse,
  type InquiryListQuery,
  type InquiryListResponse,
  type InquiryReplyRequest,
  type InquiryStatusUpdateRequest,
} from '@repo/contracts';
import type { User } from '@repo/db';
import { z } from 'zod';
import { CurrentUser, Roles } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import { InquiriesService } from './inquiries.service';

// Inquiry ids are UUIDs; reject malformed path params before they reach Prisma.
const inquiryIdSchema = z.uuid();

// Staff side of client inquiries. The global AuthGuard already requires a valid
// session; the class-level @Roles narrows WRITES (reply, status change) to the
// inquiry officer (their own branch) and the pharmacy admin (cross-branch
// oversight within their pharmacy). The GET handlers widen the allow-list to
// include the PHARMACY_EMPLOYEE, who gets read-only visibility of their branch's
// queue. Every handler scopes its work to the caller's tenant predicate (see the
// service).
@Controller('inquiries')
@Roles('INQUIRY_OFFICER', 'PHARMACY_ADMIN')
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  @Get()
  @Roles('INQUIRY_OFFICER', 'PHARMACY_ADMIN', 'PHARMACY_EMPLOYEE')
  list(
    @Query(new ZodValidationPipe(inquiryListQuerySchema))
    query: InquiryListQuery,
    @CurrentUser() actor: User,
  ): Promise<InquiryListResponse> {
    return this.inquiriesService.list(query, actor);
  }

  @Get(':id')
  @Roles('INQUIRY_OFFICER', 'PHARMACY_ADMIN', 'PHARMACY_EMPLOYEE')
  detail(
    @Param('id', new ZodValidationPipe(inquiryIdSchema)) id: string,
    @CurrentUser() actor: User,
  ): Promise<InquiryDetailResponse> {
    return this.inquiriesService.detail(id, actor);
  }

  @Post(':id/messages')
  reply(
    @Param('id', new ZodValidationPipe(inquiryIdSchema)) id: string,
    @Body(new ZodValidationPipe(inquiryReplyRequestSchema))
    body: InquiryReplyRequest,
    @CurrentUser() actor: User,
  ): Promise<InquiryDetailResponse> {
    return this.inquiriesService.reply(id, body, actor);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', new ZodValidationPipe(inquiryIdSchema)) id: string,
    @Body(new ZodValidationPipe(inquiryStatusUpdateRequestSchema))
    body: InquiryStatusUpdateRequest,
    @CurrentUser() actor: User,
  ): Promise<InquiryDetailResponse> {
    return this.inquiriesService.updateStatus(id, body, actor);
  }
}
