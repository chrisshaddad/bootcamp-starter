import { Module } from '@nestjs/common';
import { LibraryMembersModule } from '../library-members/library-members.module';
import { CatalogModule } from '../catalog/catalog.module';
import { CirculationModule } from '../circulation/circulation.module';
import { CommerceModule } from '../commerce/commerce.module';
import { ChatModule } from '../chat/chat.module';
import { PortalMembershipsController } from './portal-memberships.controller';
import { PortalBooksController } from './portal-books.controller';
import { PortalBookCopiesController } from './portal-book-copies.controller';
import { PortalRentalsController } from './portal-rentals.controller';
import { PortalReservationsController } from './portal-reservations.controller';
import { PortalCartController } from './portal-cart.controller';
import { PortalCategoriesController } from './portal-categories.controller';
import { PortalAuthorsController } from './portal-authors.controller';
import { PortalChatController } from './portal-chat.controller';
import { PortalDashboardController } from './portal-dashboard.controller';

@Module({
  imports: [
    LibraryMembersModule,
    CatalogModule,
    CirculationModule,
    CommerceModule,
    ChatModule,
  ],
  controllers: [
    PortalMembershipsController,
    PortalBooksController,
    PortalBookCopiesController,
    PortalRentalsController,
    PortalReservationsController,
    PortalCartController,
    PortalCategoriesController,
    PortalAuthorsController,
    PortalChatController,
    PortalDashboardController,
  ],
})
export class PortalModule {}
