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

        // Declare the exchanges
        await this.channel.assertExchange(rabbitConfig.exchange, 'topic', {
          durable: true,
        });

        await this.channel.assertExchange('sales-dlx', 'topic', {
          durable: true,
        });

        // Ensure the queue exists; if it already exists with different configuration, delete and re-declare it
        try {
          await this.channel.deleteQueue('sales-service-queue');
          console.log('Deleted existing sales-service-queue to recreate it');
        } catch (deleteErr) {
          console.log(
            'No existing sales-service-queue or failed to delete it:',
            deleteErr,
          );
        }

        // Declare the main queue with DLX argument
        const mainQueue = await this.channel.assertQueue(
          'sales-service-queue',
          {
            durable: true,
            arguments: {
              'x-dead-letter-exchange': 'sales-dlx', // Dead Letter Exchange
              'x-dead-letter-routing-key': 'sales.retry', // DLX routing key
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

        // Bind the queue to the exchange for each routing key
        for (const key of bindings) {
          await this.channel.bindQueue(
            mainQueue.queue,
            rabbitConfig.exchange,
            key,
          );
        }

        // Declare the retry queue with TTL and DLX
        await this.channel.assertQueue('sales-retry-queue', {
          durable: true,
          arguments: {
            'x-message-ttl': 5000, // Retry delay (5 seconds)
            'x-dead-letter-exchange': rabbitConfig.exchange,
          },
        });

        await this.channel.bindQueue(
          'sales-retry-queue',
          'sales-dlx',
          'sales.retry',
        );

        // Declare the dead-letter queue
        await this.channel.assertQueue('sales-dead-queue', {
          durable: true,
        });

        await this.channel.bindQueue(
          'sales-dead-queue',
          'sales-dlx',
          'sales.dead',
        );

        await this.channel.prefetch(25);

        // Start consuming the main queue
        await this.channel.consume(
          mainQueue.queue,
          (msg) => this.handleMessage(msg),
          { noAck: false },
        );

        console.log('Sales consumer connected with DLQ + retry');
      } catch (err) {
        console.log('RabbitMQ not ready — retry in 5s');
        await new Promise((res) => setTimeout(res, 5000));
      }
    }
  }
  private async handleMessage(msg: ConsumeMessage | null): Promise<void> {
    if (!msg) return;

    const routingKey = msg.fields.routingKey;

    try {
      const message = JSON.parse(msg.content.toString()) as {
        eventId: string;
        payload: { orderId: string };
      };

      const data: OrderStatusEvent = {
        eventId: message.eventId,
        orderId: message.payload.orderId,
      };

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
      }

      this.channel.ack(msg);
    } catch (err) {
      console.error('EVENT PROCESSING FAILED', err);

      const deathCount =
        (msg.properties.headers?.['x-death']?.[0]?.count as number) || 0;

      if (deathCount >= 3) {
        console.error('Max retries reached — sending to permanent DLQ');

        this.channel.publish('sales-dlx', 'sales.dead', msg.content, {
          persistent: true,
        });

        this.channel.ack(msg);
      } else {
        console.log(`Retry attempt ${deathCount + 1}`);

        // Send to retry queue (via DLX)
        this.channel.nack(msg, false, false);
      }
    }
  }
}
