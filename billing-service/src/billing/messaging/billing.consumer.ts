/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-misused-promises */

import { Injectable } from '@nestjs/common';
import { connect, Channel, ChannelModel, ConsumeMessage } from 'amqplib';
import { rabbitmqConfig } from '../../config/rabbitmq.config';
import { BillingService } from '../billing.service';

@Injectable()
export class BillingConsumer {
  private connection?: ChannelModel;
  private channel?: Channel;

  constructor(private readonly billingService: BillingService) {}

  async start(): Promise<void> {
    if (this.connection && this.channel) return;
    await this.connectWithRetry();
  }

  private async connectWithRetry() {
    const url = rabbitmqConfig.url;

    while (!this.channel) {
      try {
        console.log('Billing consumer connecting to RabbitMQ...');

        this.connection = await connect(url);
        this.channel = await this.connection.createChannel();

        // ---------------- MAIN EXCHANGE ----------------
        await this.channel.assertExchange(rabbitmqConfig.exchange, 'topic', {
          durable: true,
        });

        // ---------------- DEAD LETTER EXCHANGE ----------------
        await this.channel.assertExchange('billing-dlx', 'topic', {
          durable: true,
        });

        // ---------------- MAIN QUEUE ----------------
        const mainQueue = await this.channel.assertQueue(
          'billing-service-queue',
          {
            durable: true,
            arguments: {
              'x-dead-letter-exchange': 'billing-dlx',
              'x-dead-letter-routing-key': 'billing.retry',
            },
          },
        );

        await this.channel.bindQueue(
          mainQueue.queue,
          rabbitmqConfig.exchange,
          'order.created',
        );

        await this.channel.bindQueue(
          mainQueue.queue,
          rabbitmqConfig.exchange,
          'order.refund.requested',
        );

        // ---------------- RETRY QUEUE ----------------
        await this.channel.assertQueue('billing-retry-queue', {
          durable: true,
          arguments: {
            'x-message-ttl': 5000, // retry delay (5 seconds)
            'x-dead-letter-exchange': rabbitmqConfig.exchange,
          },
        });

        await this.channel.bindQueue(
          'billing-retry-queue',
          'billing-dlx',
          'billing.retry',
        );

        // ---------------- DEAD QUEUE ----------------
        await this.channel.assertQueue('billing-dead-queue', {
          durable: true,
        });

        await this.channel.bindQueue(
          'billing-dead-queue',
          'billing-dlx',
          'billing.dead',
        );

        await this.channel.prefetch(25);

        // ---------------- CONSUMER ----------------
        await this.channel.consume(
          mainQueue.queue,
          async (msg: ConsumeMessage | null) => {
            if (!msg || !this.channel) return;

            const routingKey = msg.fields.routingKey;
            const raw = msg.content.toString();

            try {
              const parsed = JSON.parse(raw);

              if (!parsed.eventId || !parsed.payload) {
                throw new Error('Invalid event structure');
              }

              await this.billingService.processEvent(routingKey, parsed);

              this.channel.ack(msg);
            } catch (err) {
              console.error('Billing event failed:', err);

              const deathCount =
                (msg.properties.headers?.['x-death']?.[0]?.count as number) ||
                0;

              if (deathCount >= 3) {
                console.error('Max retries reached — sending to billing DLQ');

                this.channel.publish('billing-dlx', 'billing.dead', msg.content, {
                  persistent: true,
                });

                this.channel.ack(msg);
              } else {
                console.log(`Retry attempt ${deathCount + 1}`);

                // send to retry queue
                this.channel.nack(msg, false, false);
              }
            }
          },
        );

        console.log('Billing consumer started with retry + DLQ');
      } catch (err) {
        console.log('RabbitMQ not ready — retry in 5s');
        await new Promise((res) => setTimeout(res, 5000));
      }
    }
  }

  async close(): Promise<void> {
    await this.channel?.close().catch(() => {});
    await this.connection?.close().catch(() => {});
  }
}