import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { listPublicPlans } from './plan-catalog';

@ApiTags('plans')
@Controller('plans')
export class PlansController {
  @Public()
  @Get()
  getPlans() {
    return listPublicPlans();
  }
}
