import { Body, Controller, Post, UsePipes } from '@nestjs/common';
import { createUserSchema, type CreateUserBody } from '@repo/contracts';
import { UsersService } from './users.service';
import { Roles } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('SUPER_ADMIN')
  @UsePipes(new ZodValidationPipe(createUserSchema))
  async create(@Body() body: CreateUserBody) {
    return this.usersService.create(body);
  }
}
