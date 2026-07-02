import { Controller, Get, Param } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators';
import { EmployeesService } from './employees.service';
import type { User } from '@repo/db';
import type { EmployeeResponse } from '@repo/contracts';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<EmployeeResponse> {
    return this.employeesService.findOne(id, user);
  }
}
