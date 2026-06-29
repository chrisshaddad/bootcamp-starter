import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetAssignmentsDto {
  @ApiProperty({
    type: [String],
    description: 'Replace the full set of user assignments for this building',
  })
  @IsArray()
  @IsString({ each: true })
  userIds: string[];
}
