import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { BillingModule } from './billing/billing.module';

import { Account } from './billing/entities/account.entity';
import { Payment } from './billing/entities/payment.entity';
import { Refund } from './billing/entities/refund.entity';
import { OutboxEvent } from './billing/outbox/outbox.entity';
import { InboxEvent } from './billing/inbox/inbox.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,

      entities: [Account, Payment, Refund, OutboxEvent, InboxEvent],
      synchronize: true,
      logging: true,
    }),

    BillingModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
