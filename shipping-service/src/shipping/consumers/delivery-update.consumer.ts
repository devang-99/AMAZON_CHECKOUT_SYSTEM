/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-misused-promises */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { connect, Channel, ConsumeMessage } from 'amqplib';

@Injectable()
export class RabbitMQService implements OnModuleInit {
  private connection!: Awaited<ReturnType<typeof connect>>;
  private channel!: Channel;

  async onModuleInit() {
    await this.init();
  }

  private async init() {
    const url = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';

    while (true) {
      try {
        this.connection = await connect(url);
        this.channel = await this.connection.createChannel();

        await this.channel.prefetch(25);

        console.log('RabbitMQ connected (shipping)');
        break;
      } catch (err) {
        console.log('RabbitMQ not ready (shipping), retrying in 5s...');
        await new Promise((res) => setTimeout(res, 5000));
      }
    }
  }

async publish(queue: string, message: any) {
  await this.channel.assertQueue(queue, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': 'shipping-dlx',
    },
  });

  this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
    persistent: true,
  });
}

async subscribe(
  queue: string,
  handler: (msg: any, rawMsg: ConsumeMessage) => Promise<void>,
) {
  await this.channel.assertQueue(queue, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': 'shipping-dlx',
    },
  });

  await this.channel.consume(queue, async (msg) => {
    if (!msg) return;
    const content = JSON.parse(msg.content.toString());
    await handler(content, msg);
  });
}

  ack(msg: ConsumeMessage) {
    this.channel.ack(msg);
  }

  nack(msg: ConsumeMessage) {
    this.channel.nack(msg);
  }
}
