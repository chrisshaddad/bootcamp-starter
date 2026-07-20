import { AuditModule } from '../audit/audit.module';
import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';

@Module({
  imports: [AuditModule],
  providers: [BookingsService],
  controllers: [BookingsController],
})
export class BookingsModule {}
