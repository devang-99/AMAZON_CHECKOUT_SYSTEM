import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersModule } from './orders/orders.module';
import { HealthController } from './health.controller';

import { Order } from './orders/entities/order.entity';
import { OrderItem } from './orders/entities/order-item.entity';
import { OutboxEvent } from './outbox/outbox.entity';
import { InboxEvent } from './inbox/inbox.entity';
import { AppDataSource } from './config/datasource';

@Module({
  imports: [TypeOrmModule.forRoot(AppDataSource.options), OrdersModule],
  controllers: [HealthController],
})
export class AppModule {}
