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
  pharmacyAssignBranchRequestSchema,
  pharmacyCreateRequestSchema,
  type BranchCreateRequest,
  type BranchUpdateRequest,
  type PharmacyAssignBranchRequest,
  type PharmacyAdminListResponse,
  type PharmacyCreateRequest,
  type PharmacyDetailResponse,
  type PharmacyListResponse,
} from '@repo/contracts';
import type { User } from '@repo/db';
import { z } from 'zod';
import { CurrentUser, Roles } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import { PharmaciesService } from './pharmacies.service';

// Pharmacy and branch ids are UUIDs; reject malformed path params before Prisma.
const idSchema = z.uuid();

// Pharmacy endpoints for the super-admin console. The global AuthGuard already
// requires a valid session; @Roles narrows access to platform admins.
@Controller('pharmacies')
@Roles('SUPER_ADMIN')
export class PharmaciesController {
  constructor(private readonly pharmaciesService: PharmaciesService) {}

  // Lightweight list for selection dropdowns (id + name only).
  @Get()
  list(): Promise<PharmacyListResponse> {
    return this.pharmaciesService.list();
  }

  // Rich list for the pharmacies console — carries branch/admin/user counts.
  // Declared before ':id' so the static path always wins.
  @Get('admin')
  adminList(): Promise<PharmacyAdminListResponse> {
    return this.pharmaciesService.adminList();
  }

  // One pharmacy with its branches and users.
  @Get(':id')
  detail(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
  ): Promise<PharmacyDetailResponse> {
    return this.pharmaciesService.detail(id);
  }

  // Register a pharmacy and invite its first admin; returns the refreshed list.
  @Post()
  create(
    @Body(new ZodValidationPipe(pharmacyCreateRequestSchema))
    body: PharmacyCreateRequest,
    @CurrentUser() actor: User,
  ): Promise<PharmacyAdminListResponse> {
    return this.pharmaciesService.create(body, actor.id);
  }

  // Delete a pharmacy (blocked while it still has users).
  @Delete(':id')
  remove(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @CurrentUser() actor: User,
  ): Promise<PharmacyAdminListResponse> {
    return this.pharmaciesService.remove(id, actor.id);
  }

  // Add a branch; returns the refreshed pharmacy detail.
  @Post(':id/branches')
  addBranch(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @Body(new ZodValidationPipe(branchCreateRequestSchema))
    body: BranchCreateRequest,
    @CurrentUser() actor: User,
  ): Promise<PharmacyDetailResponse> {
    return this.pharmaciesService.addBranch(id, body, actor.id);
  }

  // Edit a branch; returns the refreshed pharmacy detail.
  @Patch(':id/branches/:branchId')
  updateBranch(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @Param('branchId', new ZodValidationPipe(idSchema)) branchId: string,
    @Body(new ZodValidationPipe(branchUpdateRequestSchema))
    body: BranchUpdateRequest,
    @CurrentUser() actor: User,
  ): Promise<PharmacyDetailResponse> {
    return this.pharmaciesService.updateBranch(id, branchId, body, actor.id);
  }

  // Delete a branch (blocked while it still has users).
  @Delete(':id/branches/:branchId')
  removeBranch(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @Param('branchId', new ZodValidationPipe(idSchema)) branchId: string,
    @CurrentUser() actor: User,
  ): Promise<PharmacyDetailResponse> {
    return this.pharmaciesService.removeBranch(id, branchId, actor.id);
  }

  // Assign one of the pharmacy's users to a branch (or clear it with null).
  @Patch(':id/users/:userId/branch')
  assignUserBranch(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @Param('userId', new ZodValidationPipe(idSchema)) userId: string,
    @Body(new ZodValidationPipe(pharmacyAssignBranchRequestSchema))
    body: PharmacyAssignBranchRequest,
    @CurrentUser() actor: User,
  ): Promise<PharmacyDetailResponse> {
    return this.pharmaciesService.assignUserBranch(
      id,
      userId,
      body.branchId,
      actor.id,
    );
  }
}
