/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';
import { rabbitConfig } from '../config/rabbitmq.config';
import { v4 as uuid } from 'uuid';

@Injectable()
export class RabbitPublisher implements OnModuleInit, OnModuleDestroy {
  private connection?: amqp.ChannelModel;
  private channel?: amqp.Channel;

  async onModuleInit() {
    await this.startConnectionLoop();
  }

  async onModuleDestroy() {
    await this.channel?.close().catch(() => {});
    await this.connection?.close().catch(() => {});
  }

  private async startConnectionLoop() {
    const url = rabbitConfig.url;

    while (!this.channel) {
      try {
        console.log('Sales connecting to RabbitMQ...');

        const conn = await amqp.connect(url);
        const channel = await conn.createChannel();

        await channel.assertExchange(rabbitConfig.exchange, 'topic', {
          durable: true,
        });

        this.connection = conn;
        this.channel = channel;

        conn.on('close', async () => {
          console.log('RabbitMQ connection closed. Reconnecting...');
          this.channel = undefined as any;
          await this.startConnectionLoop();
        });

        console.log('Sales RabbitMQ connected');
      } catch (err) {
        console.log('RabbitMQ not ready — retry in 5s');
        await new Promise((res) => setTimeout(res, 5000));
      }
    }
  }

  publish(event: string, payload: any): boolean {
    if (!this.channel) {
      console.warn('RabbitMQ not connected');
      return false;
    }

    const message = {
      eventId: uuid(),
      payload,
    };

    return this.channel.publish(
      rabbitConfig.exchange,
      event,
      Buffer.from(JSON.stringify(message)),
      { persistent: true },
    );
  }
}
