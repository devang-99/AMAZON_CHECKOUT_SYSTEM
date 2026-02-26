import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OutboxEntity } from './outbox.entity';

@Injectable()
export class OutboxService {
  constructor(
    @InjectRepository(OutboxEntity)
    private outboxRepo: Repository<OutboxEntity>,
  ) {}

  async saveEvent(event: { eventId: string; eventType: string; payload: any }) {
    const record = this.outboxRepo.create({
      ...event,
      processed: false,
    });

    await this.outboxRepo.save(record);
  }

  async getUnprocessedEvents(): Promise<OutboxEntity[]> {
    return await this.outboxRepo.find({
      where: { processed: false },
      order: { createdAt: 'ASC' },
      take: 100,
    });
  }

  async markProcessed(id: string) {
    await this.outboxRepo.update(id, { processed: true });
  }
}
