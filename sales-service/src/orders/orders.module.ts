import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersGateway } from '../websocket/orders.gateway';
import { RabbitPublisher } from '../messaging/rabbitmq.publisher';
import { OutboxProcessor } from '../outbox/outbox.processor';
import { OrdersConsumer } from 'src/messaging/rabbitmq.consumer';

@Module({
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrdersGateway,
    RabbitPublisher,
    OrdersConsumer,
    OutboxProcessor,
  ],
})
export class OrdersModule {}
