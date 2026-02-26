import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { BillingConsumer } from './messaging/billing.consumer';

import { Account } from './entities/account.entity';
import { Payment } from './entities/payment.entity';
import { Refund } from './entities/refund.entity';
import { RabbitMQPublisher } from './messaging/rabbitmq.publisher';
import { OutboxProcessor } from './outbox/outbox.processor';

@Module({
  imports: [TypeOrmModule.forFeature([Account, Payment, Refund])],
  controllers: [BillingController],
  providers: [
    BillingService,
    BillingConsumer,
    RabbitMQPublisher,
    OutboxProcessor,
  ],
})
export class BillingModule {}
