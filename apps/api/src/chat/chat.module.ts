import { Module } from '@nestjs/common';
import { DashboardModule } from '../dashboard/dashboard.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { GoalsModule } from '../goals/goals.module';
import { ProductsModule } from '../products/products.module';
import { SalesModule } from '../sales/sales.module';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';

@Module({
  imports: [
    DashboardModule,
    ExpensesModule,
    GoalsModule,
    ProductsModule,
    SalesModule,
  ],
  providers: [ChatService],
  controllers: [ChatController],
})
export class ChatModule {}
