// inbox.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';

@Entity('inbox_events')
@Unique(['eventId'])
export class InboxEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  eventId: string;

  @Column()
  eventType: string;

  @CreateDateColumn()
  processedAt: Date;
}
