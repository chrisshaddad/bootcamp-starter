import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PlanKey } from '../plan-catalog';

export class CreateCheckoutSessionDto {
  @ApiProperty({ enum: ['starter', 'growth', 'pro'] })
  @IsIn(['starter', 'growth', 'pro'])
  planKey: PlanKey;

  @ApiProperty({ required: false, default: 'en' })
  @IsOptional()
  @IsString()
  locale?: string;
}
