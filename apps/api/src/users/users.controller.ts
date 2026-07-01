import { Body, Controller, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from '../auth/decorators';

interface CreateUserBody {
  name: string;
  email: string;
  role: 'ORG_ADMIN' | 'MEMBER';
  dateOfBirth?: string;
  className?: string;
  sectionName?: string;
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('SUPER_ADMIN')
  async create(@Body() body: CreateUserBody) {
    return this.usersService.create(body);
  }
}
