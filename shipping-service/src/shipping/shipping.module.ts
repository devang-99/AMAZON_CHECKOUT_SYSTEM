import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ShippingController } from './controller/shipping.controller';
import { ShippingService } from './service/shipping.service';
import { ShipmentLifecycleService } from './service/shipment-lifecycle';
import { InventoryService } from './service/inventory.service';

import { ShipmentEntity } from './entities/shipment.entity';
import { ShipmentItemEntity } from './entities/shipment-item.entity';
import { InventoryEntity } from './entities/inventory.entity';
import { ProcessedOrderEntity } from './entities/processed-order.entity';

import { ShippingPublisher } from './publishers/shipping.publisher';
import { OrderBilledConsumer } from './consumers/order-billed.consumer';

import { RabbitMQModule } from '../messaging/rabbitmq/rabbitmq.module';
import { RabbitMQService } from '../messaging/rabbitmq/rabbitmq.service';

import { OutboxProcessor } from '../messaging/outbox/outbox.processor';
import { OutboxService } from '../messaging/outbox/outbox.service';
import { OutboxEntity } from '../messaging/outbox/outbox.entity';

import { InboxService } from '../messaging/inbox/inbox.service';
import { InboxEntity } from 'src/messaging/inbox/inbox.entity';
import { OrderCreatedConsumer } from './consumers/order-created.consumer';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ShipmentEntity,
      ShipmentItemEntity,
      InventoryEntity,
      ProcessedOrderEntity,
      OutboxEntity,
      InboxEntity,
    ]),
    RabbitMQModule,
  ],

  controllers: [ShippingController],

  providers: [
    ShippingService,
    ShipmentLifecycleService,
    InventoryService,
    ShippingPublisher,

    RabbitMQService,
    OutboxService,
    OutboxProcessor,
    InboxService,

    OrderBilledConsumer,
    OrderCreatedConsumer,
  ],
})
export class ShippingModule {}
