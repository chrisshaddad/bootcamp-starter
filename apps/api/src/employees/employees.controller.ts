import { Controller, Get, Patch, Param, Body, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import { EmployeesService } from './employees.service';
import type { User } from '@repo/db';
import {
  employeeListQuerySchema,
  employeeSkillsUpdateRequestSchema,
  type EmployeeListQuery,
  type EmployeeListResponse,
  type EmployeeResponse,
  type EmployeeSkillsUpdateRequest,
} from '@repo/contracts';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(employeeListQuerySchema))
    query: EmployeeListQuery,
  ): Promise<EmployeeListResponse> {
    return this.employeesService.findAll(query, user);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<EmployeeResponse> {
    return this.employeesService.findOne(id, user);
  }

  @Patch(':id/skills')
  async updateSkills(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(employeeSkillsUpdateRequestSchema))
    body: EmployeeSkillsUpdateRequest,
  ): Promise<EmployeeResponse> {
    return this.employeesService.updateSkills(id, body, user);
  }
}
