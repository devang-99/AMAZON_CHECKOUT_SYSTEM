import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InboxEntity } from './inbox.entity';

@Injectable()
export class InboxService {
  constructor(
    @InjectRepository(InboxEntity)
    private inboxRepo: Repository<InboxEntity>,
  ) {}

  async isProcessed(eventId: string): Promise<boolean> {
    const existing = await this.inboxRepo.findOne({
      where: { eventId },
    });
    return !!existing;
  }

  async markProcessed(eventId: string, eventType: string) {
    const record = this.inboxRepo.create({
      eventId,
      eventType,
    });

    await this.inboxRepo.save(record);
  }
}
