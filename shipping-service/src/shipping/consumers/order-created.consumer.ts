/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { RabbitMQService } from '../../messaging/rabbitmq/rabbitmq.service';
import { InboxService } from '../../messaging/inbox/inbox.service';
import { ShippingService } from '../service/shipping.service';

@Injectable()
export class OrderCreatedConsumer {
  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly inbox: InboxService,
    private readonly shippingService: ShippingService,
  ) {}

  async start() {
    await this.rabbitmq.subscribe(
      'order.created',
      this.handleMessage.bind(this),
    );

    console.log('Shipping consumer listening for order.created');
  }

  private async handleMessage(message: any, rawMsg: any) {
    const { eventId, payload } = message;

    try {
      const alreadyProcessed = await this.inbox.isProcessed(eventId);
      if (alreadyProcessed) {
        this.rabbitmq.ack(rawMsg);
        return;
      }

      await this.shippingService.handleOrderCreated(payload);

      await this.inbox.markProcessed(eventId, 'order.created');

      this.rabbitmq.ack(rawMsg);
    } catch (err) {
      console.error('order.created failed', err);
      this.rabbitmq.nack(rawMsg);
    }
  }
}
