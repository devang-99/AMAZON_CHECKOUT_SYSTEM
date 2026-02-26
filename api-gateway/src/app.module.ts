import { Module } from '@nestjs/common';
import { OrdersController } from './order/order.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [OrdersController],
})
export class AppModule {}
