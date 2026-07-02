import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MeService } from './me.service';
import { CurrentUser } from '@/common/decorators';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';

@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get()
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.meService.getOrProvision(user);
  }
}
