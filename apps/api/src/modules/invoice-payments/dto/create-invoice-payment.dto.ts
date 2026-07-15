import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoicePaymentMethod } from '@repo/db';

export class CreateInvoicePaymentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  invoiceId: string;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;

  @ApiProperty({ enum: InvoicePaymentMethod })
  @IsEnum(InvoicePaymentMethod)
  method: InvoicePaymentMethod;

  @ApiProperty()
  @IsDateString()
  paidAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
