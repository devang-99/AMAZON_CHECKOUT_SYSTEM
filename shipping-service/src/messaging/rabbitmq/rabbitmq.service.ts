import { Injectable, OnModuleInit } from '@nestjs/common';
import { connect, Channel, ChannelModel, ConsumeMessage } from 'amqplib';

@Injectable()
export class RabbitMQService implements OnModuleInit {
  private connection?: ChannelModel;
  private channel?: Channel;

  private exchange = process.env.RABBITMQ_EXCHANGE!;
  private url = process.env.RABBITMQ_URL!;
  private queue = process.env.SHIPPING_QUEUE || 'shipping-service-queue';

  private readonly DLX = 'shipping-dlx';
  private readonly RETRY_QUEUE = 'shipping-retry-queue';
  private readonly DEAD_QUEUE = 'shipping-dead-queue';

  async onModuleInit() {
    await this.connectWithRetry();
    await this.setupTopology();
  }

  private async connectWithRetry() {
    while (!this.channel) {
      try {
        console.log('Shipping connecting to RabbitMQ...');

        this.connection = await connect(this.url);
        this.channel = await this.connection.createChannel();

        await this.channel.prefetch(25);

        console.log('Shipping RabbitMQ connected');
      } catch {
        console.log('RabbitMQ retry in 5s...');
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }

  /**
   * 🔥 DECLARE ALL INFRASTRUCTURE ONLY ONCE
   */
  private async setupTopology() {
    if (!this.channel) return;

    // main exchange
    await this.channel.assertExchange(this.exchange, 'topic', {
      durable: true,
    });

    // DLX
    await this.channel.assertExchange(this.DLX, 'topic', {
      durable: true,
    });

    // MAIN QUEUE (WITH DLX → RETRY)
    await this.channel.assertQueue(this.queue, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': this.DLX,
        'x-dead-letter-routing-key': 'shipping.retry',
      },
    });

    // RETRY QUEUE (TTL → BACK TO MAIN EXCHANGE)
    await this.channel.assertQueue(this.RETRY_QUEUE, {
      durable: true,
      arguments: {
        'x-message-ttl': 5000,
        'x-dead-letter-exchange': this.exchange,
        'x-dead-letter-routing-key': 'order.created', // adjust if needed
      },
    });

    await this.channel.bindQueue(this.RETRY_QUEUE, this.DLX, 'shipping.retry');

    // DEAD QUEUE
    await this.channel.assertQueue(this.DEAD_QUEUE, { durable: true });

    await this.channel.bindQueue(this.DEAD_QUEUE, this.DLX, 'shipping.dead');

    console.log('Shipping RabbitMQ topology ready (retry + DLQ)');
  }

  async publish(routingKey: string, message: any): Promise<boolean> {
    if (!this.channel) return false;

    return this.channel.publish(
      this.exchange,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      { persistent: true },
    );
  }

  async subscribe(
    routingKey: string,
    handler: (msg: any, rawMsg: ConsumeMessage) => Promise<void>,
  ) {
    if (!this.channel) return;

    // DO NOT REDECLARE QUEUE WITH DIFFERENT CONFIG
    await this.channel.bindQueue(this.queue, this.exchange, routingKey);

    await this.channel.consume(this.queue, async (msg) => {
      if (!msg) return;

      try {
        const content = JSON.parse(msg.content.toString());
        await handler(content, msg);
      } catch (err) {
        console.error('Shipping handler crash', err);
        this.handleRetry(msg);
      }
    });

    console.log(`Subscribed to ${routingKey}`);
  }

  ack(msg: ConsumeMessage) {
    this.channel?.ack(msg);
  }

  nack(msg: ConsumeMessage) {
    this.handleRetry(msg);
  }

  private handleRetry(msg: ConsumeMessage) {
    const deathCount =
      (msg.properties.headers?.['x-death']?.[0]?.count as number) || 0;

    if (deathCount >= 3) {
      console.error('Shipping max retries reached → DEAD QUEUE');

      this.channel?.publish(this.DLX, 'shipping.dead', msg.content, {
        persistent: true,
      });

      this.channel?.ack(msg);
      return;
    }

    console.log(`Shipping retry attempt ${deathCount + 1}`);

    // send to retry queue
    this.channel?.nack(msg, false, false);
  }
}
