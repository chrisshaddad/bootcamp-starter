import { PartialType } from '@nestjs/swagger';
import { CreateRenterDto } from './create-renter.dto';

export class UpdateRenterDto extends PartialType(CreateRenterDto) {}
