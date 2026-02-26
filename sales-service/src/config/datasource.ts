import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { OutboxEvent } from 'src/outbox/outbox.entity';
import { InboxEvent } from 'src/inbox/inbox.entity';
import { OrderItem } from 'src/orders/entities/order-item.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [Order, OutboxEvent, InboxEvent,OrderItem],
  synchronize: true,
});
