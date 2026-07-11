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
  employeeInviteRequestSchema,
  employeeListQuerySchema,
  employeeUpdateRequestSchema,
  type EmployeeBranchOptionsResponse,
  type EmployeeInviteRequest,
  type EmployeeListQuery,
  type EmployeeListResponse,
  type EmployeeResponse,
  type EmployeeUpdateRequest,
} from '@repo/contracts';
import type { User } from '@repo/db';
import { z } from 'zod';
import { CurrentUser, Roles } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import { EmployeesService } from './employees.service';

// Employee ids are UUIDs; reject malformed path params before they reach Prisma.
const employeeIdSchema = z.uuid();

// Pharmacy-admin staff management. The global AuthGuard already requires a valid
// session; @Roles narrows access to pharmacy admins. Every handler scopes its
// work to the caller's own pharmacy (see the service).
@Controller('employees')
@Roles('PHARMACY_ADMIN')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(employeeListQuerySchema))
    query: EmployeeListQuery,
    @CurrentUser() actor: User,
  ): Promise<EmployeeListResponse> {
    return this.employeesService.list(query, actor);
  }

  @Get('branches')
  branches(@CurrentUser() actor: User): Promise<EmployeeBranchOptionsResponse> {
    return this.employeesService.branchOptions(actor);
  }

  @Post()
  invite(
    @Body(new ZodValidationPipe(employeeInviteRequestSchema))
    body: EmployeeInviteRequest,
    @CurrentUser() actor: User,
  ): Promise<EmployeeResponse> {
    return this.employeesService.invite(body, actor);
  }

  @Patch(':id')
  update(
    @Param('id', new ZodValidationPipe(employeeIdSchema)) id: string,
    @Body(new ZodValidationPipe(employeeUpdateRequestSchema))
    body: EmployeeUpdateRequest,
    @CurrentUser() actor: User,
  ): Promise<EmployeeResponse> {
    return this.employeesService.update(id, body, actor);
  }
}
