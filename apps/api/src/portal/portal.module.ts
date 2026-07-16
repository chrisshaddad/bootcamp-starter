import { Module } from '@nestjs/common';
import { LibraryMembersModule } from '../library-members/library-members.module';
import { CatalogModule } from '../catalog/catalog.module';
import { CirculationModule } from '../circulation/circulation.module';
import { CommerceModule } from '../commerce/commerce.module';
import { PortalMembershipsController } from './portal-memberships.controller';
import { PortalBooksController } from './portal-books.controller';
import { PortalBookCopiesController } from './portal-book-copies.controller';
import { PortalRentalsController } from './portal-rentals.controller';
import { PortalReservationsController } from './portal-reservations.controller';
import { PortalCartController } from './portal-cart.controller';

@Module({
  imports: [
    LibraryMembersModule,
    CatalogModule,
    CirculationModule,
    CommerceModule,
  ],
  controllers: [
    PortalMembershipsController,
    PortalBooksController,
    PortalBookCopiesController,
    PortalRentalsController,
    PortalReservationsController,
    PortalCartController,
  ],
})
export class PortalModule {}
