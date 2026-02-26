/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OutboxEvent } from './outbox.entity';
import { RabbitMQPublisher } from '../messaging/rabbitmq.publisher';
@Injectable()
export class OutboxProcessor {
  constructor(
    private readonly dataSource: DataSource,
    private readonly publisher: RabbitMQPublisher,
  ) {}

  async process(): Promise<void> {
    const repo = this.dataSource.getRepository(OutboxEvent);

    const events = await repo.find({
      where: { processed: false },
      take: 20,
      order: { createdAt: 'ASC' },
    });

    if (events.length === 0) {
      console.log('No billing outbox events');
      return;
    }

    for (const event of events) {
      const success = await this.publisher.publish(event.eventType, {
        eventId: event.id,
        payload: event.payload,
      });

      if (success) {
        event.processed = true;
        await repo.save(event);
        console.log('Billing event published:', event.eventType);
      }
    }
  }
}
