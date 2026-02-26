import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

import { Account } from '../billing/entities/account.entity';
import { Payment } from '../billing/entities/payment.entity';
import { Refund } from '../billing/entities/refund.entity';
import { OutboxEvent } from 'src/billing/outbox/outbox.entity';
import { InboxEvent } from 'src/billing/inbox/inbox.entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  entities: [Account, Payment, Refund, OutboxEvent, InboxEvent],

  synchronize: true,
  logging: true,
});
