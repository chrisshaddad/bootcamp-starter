import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  branchDirectoryRequestSchema,
  type BranchDetailResponse,
  type BranchDirectoryRequest,
  type BranchDirectoryResponse,
} from '@repo/contracts';
import type { User } from '@repo/db';
import { z } from 'zod';
import { CurrentUser, Roles } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import { DirectoryService } from './directory.service';

// Branch ids are UUIDs; reject malformed path params before they reach Prisma.
const branchIdSchema = z.uuid();

/**
 * Consumer-facing, read-only pharmacy directory for clients: browse/search
 * branches and view one branch's profile with the medicines it currently
 * stocks. The directory is global/public (no tenant scope); near-me ordering
 * uses the session user's saved location. No writes → no audit.
 */
@Controller('directory')
@Roles('CLIENT')
export class DirectoryController {
  constructor(private readonly directory: DirectoryService) {}

  @Get('branches')
  list(
    @Query(new ZodValidationPipe(branchDirectoryRequestSchema))
    query: BranchDirectoryRequest,
    @CurrentUser() actor: User,
  ): Promise<BranchDirectoryResponse> {
    return this.directory.list(query, actor);
  }

  @Get('branches/:id')
  detail(
    @Param('id', new ZodValidationPipe(branchIdSchema)) id: string,
  ): Promise<BranchDetailResponse> {
    return this.directory.detail(id);
  }
}
