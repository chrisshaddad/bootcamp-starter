import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmSessionDto {
  @ApiProperty()
  @IsString()
  sessionId: string;
}
