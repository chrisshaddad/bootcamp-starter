import { Module } from '@nestjs/common';
import { RentalsService } from './rentals.service';
import { RentalsController } from './rentals.controller';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';

@Module({
  providers: [RentalsService, ReservationsService],
  controllers: [RentalsController, ReservationsController],
  exports: [RentalsService, ReservationsService],
})
export class CirculationModule {}
