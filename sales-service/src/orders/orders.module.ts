import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersGateway } from '../websocket/orders.gateway';
import { RabbitPublisher } from '../messaging/rabbitmq.publisher';
import { OutboxProcessor } from '../outbox/outbox.processor';
import { OrdersConsumer } from 'src/messaging/rabbitmq.consumer';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { InboxEvent } from 'src/inbox/inbox.entity';
import { OutboxEvent } from 'src/outbox/outbox.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
    imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      InboxEvent,
      OutboxEvent,
    ])],

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
