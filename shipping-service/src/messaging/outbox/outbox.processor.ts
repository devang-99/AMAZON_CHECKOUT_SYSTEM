import { Injectable } from '@nestjs/common';
import { OutboxService } from './outbox.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';

@Injectable()
export class OutboxProcessor {
  constructor(
    private readonly outbox: OutboxService,
    private readonly rabbitmq: RabbitMQService,
  ) {}

  async process() {
    const events = await this.outbox.getUnprocessedEvents();

    if (events.length === 0) {
      console.log('No shipping outbox events');
      return;
    }

    for (const event of events) {
      try {
        const success = await this.rabbitmq.publish(event.eventType, {
          eventId: event.eventId,
          payload: event.payload as Record<string, unknown>,
        });

        if (!success) {
          console.log('Publish failed — will retry later');
          continue;
        }

        await this.outbox.markProcessed(event.id);

        console.log('Shipping event published:', event.eventType);
      } catch (err) {
        console.error('Shipping publish error', err);
      }
    }
  }
}
