/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { AppDataSource } from '../config/datasource';
import { OutboxEvent } from './outbox.entity';
import { RabbitPublisher } from '../messaging/rabbitmq.publisher';

@Injectable()
export class OutboxProcessor {
  constructor(private publisher: RabbitPublisher) {}

  async process() {
    const repo = AppDataSource.getRepository(OutboxEvent);

    const events = await repo.find({
      where: { processed: false },
      take: 20,
    });

    for (const event of events) {
 const success = this.publisher.publish(event.type, event.payload);

      if (success) {
        event.processed = true;
        await repo.save(event);
        console.log(' Event dispatched:', event.type);
      } else {
        console.log(' Publish failed, will retry later');
      }
    }
  }
}
