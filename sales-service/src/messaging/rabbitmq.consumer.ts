/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-misused-promises */

import { Injectable, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';
import { Channel, ConsumeMessage } from 'amqplib';
import { rabbitConfig } from '../config/rabbitmq.config';
import { OrdersService } from '../orders/orders.service';
import { OrderStatusEvent } from 'src/types/order-status-event.type';

@Injectable()
export class OrdersConsumer implements OnModuleInit {
  private channel!: Channel;

  constructor(private readonly ordersService: OrdersService) {}

  async onModuleInit(): Promise<void> {
    await this.connectWithRetry();
  }

  private async connectWithRetry() {
    while (!this.channel) {
      try {
        console.log('Sales consumer connecting to RabbitMQ...');

        const conn = await amqp.connect(rabbitConfig.url);
        this.channel = await conn.createChannel();

        await this.channel.prefetch(25);

        // ---------------- EXCHANGES ----------------
        await this.channel.assertExchange(rabbitConfig.exchange, 'topic', {
          durable: true,
        });

        await this.channel.assertExchange('sales-dlx', 'topic', {
          durable: true,
        });

        // ---------------- MAIN QUEUE ----------------
        const mainQueue = await this.channel.assertQueue(
          'sales-service-queue',
          {
            durable: true,
            arguments: {
              'x-dead-letter-exchange': 'sales-dlx',
              'x-dead-letter-routing-key': 'sales.retry',
            },
          },
        );

        const bindings = [
          'order.billed',
          'payment.failed',
          'shipping.created',
          'order.completed',
          'order.refunded',
        ];

        for (const key of bindings) {
          await this.channel.bindQueue(
            mainQueue.queue,
            rabbitConfig.exchange,
            key,
          );
        }

        // ---------------- RETRY QUEUE ----------------
        await this.channel.assertQueue('sales-retry-queue', {
          durable: true,
          arguments: {
            'x-message-ttl': 5000,
            'x-dead-letter-exchange': rabbitConfig.exchange,
          },
        });

        await this.channel.bindQueue(
          'sales-retry-queue',
          'sales-dlx',
          'sales.retry',
        );

        // ---------------- DEAD QUEUE ----------------
        await this.channel.assertQueue('sales-dead-queue', {
          durable: true,
        });

        await this.channel.bindQueue(
          'sales-dead-queue',
          'sales-dlx',
          'sales.dead',
        );

        // ---------------- CONSUMER ----------------
        await this.channel.consume(
          mainQueue.queue,
          (msg) => this.handleMessage(msg),
          { noAck: false },
        );

        console.log('Sales consumer connected with retry + DLQ');
      } catch (err) {
        console.log('RabbitMQ not ready — retry in 5s');
        await new Promise((res) => setTimeout(res, 5000));
      }
    }
  }

  private async handleMessage(msg: ConsumeMessage | null): Promise<void> {
    if (!msg || !this.channel) return;

    const routingKey = msg.fields.routingKey;

    try {
      const raw = msg.content.toString();
      console.log(`📩 Received [${routingKey}] → ${raw}`);

      const parsed = JSON.parse(raw);

      // ---------------- VALIDATION ----------------
      if (!parsed?.eventId) {
        throw new Error('Missing eventId in message');
      }

      if (!parsed?.payload?.orderId) {
        throw new Error('Missing payload.orderId');
      }

      const data: OrderStatusEvent = {
        eventId: parsed.eventId,
        orderId: parsed.payload.orderId,
      };

      // ---------------- ROUTING ----------------
      switch (routingKey) {
        case 'order.billed':
          await this.ordersService.handleOrderBilled(data);
          break;

        case 'payment.failed':
          await this.ordersService.handlePaymentFailed(data);
          break;

        case 'shipping.created':
          await this.ordersService.handleShippingCreated(data);
          break;

        case 'order.completed':
          await this.ordersService.handleOrderCompleted(data);
          break;

        case 'order.refunded':
          await this.ordersService.handleOrderRefunded(data);
          break;

        default:
          console.warn(`⚠ Unknown routing key: ${routingKey}`);
      }

      console.log(`✅ Event processed: ${parsed.eventId}`);
      this.channel.ack(msg);
    } catch (err) {
      console.error('❌ EVENT PROCESSING FAILED:', err);

      const deathCount =
        (msg.properties.headers?.['x-death']?.[0]?.count as number) || 0;

      if (deathCount >= 3) {
        console.error('🚨 Max retries reached — sending to DEAD queue');

        this.channel.publish('sales-dlx', 'sales.dead', msg.content, {
          persistent: true,
        });

        this.channel.ack(msg);
      } else {
        console.log(`🔁 Retry attempt ${deathCount + 1}`);
        this.channel.nack(msg, false, false);
      }
    }
  }
}