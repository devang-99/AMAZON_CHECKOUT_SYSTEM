import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GatewayController } from './order/order.controller';

@Module({
  imports: [HttpModule],
  controllers: [GatewayController],
})
export class AppModule {}
