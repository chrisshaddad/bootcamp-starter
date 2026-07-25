import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';

@Module({
  controllers: [PurchasesController],
  providers: [CartService, PurchasesService],
  exports: [CartService, PurchasesService],
})
export class CommerceModule {}
