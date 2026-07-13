import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  branchCreateRequestSchema,
  branchUpdateRequestSchema,
  type BranchCreateRequest,
  type BranchListResponse,
  type BranchResponse,
  type BranchUpdateRequest,
} from '@repo/contracts';
import type { User } from '@repo/db';
import { z } from 'zod';
import { CurrentUser, Roles } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import { BranchesService } from './branches.service';

// Branch ids are UUIDs; reject malformed path params before they reach Prisma.
const branchIdSchema = z.uuid();

// Pharmacy-admin branch management. The global AuthGuard already requires a
// valid session; @Roles narrows access to pharmacy admins. Every handler scopes
// its work to the caller's own pharmacy (see the service).
@Controller('branches')
@Roles('PHARMACY_ADMIN')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  list(@CurrentUser() actor: User): Promise<BranchListResponse> {
    return this.branchesService.list(actor);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(branchCreateRequestSchema))
    body: BranchCreateRequest,
    @CurrentUser() actor: User,
  ): Promise<BranchResponse> {
    return this.branchesService.create(body, actor);
  }

  @Patch(':id')
  update(
    @Param('id', new ZodValidationPipe(branchIdSchema)) id: string,
    @Body(new ZodValidationPipe(branchUpdateRequestSchema))
    body: BranchUpdateRequest,
    @CurrentUser() actor: User,
  ): Promise<BranchResponse> {
    return this.branchesService.update(id, body, actor);
  }

  @Delete(':id')
  remove(
    @Param('id', new ZodValidationPipe(branchIdSchema)) id: string,
    @CurrentUser() actor: User,
  ): Promise<{ id: string }> {
    return this.branchesService.remove(id, actor);
  }
}
