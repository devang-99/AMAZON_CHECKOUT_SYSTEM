import { Entity, PrimaryColumn, CreateDateColumn, Column } from 'typeorm';

@Entity('inbox_events')
export class InboxEvent {
  @PrimaryColumn()
  eventId: string;

  @CreateDateColumn()
  receivedAt: Date;

  @Column({ type: 'boolean', default: false })
  processed: boolean;

  @Column({ type: 'int', default: 0 })
  retryCount: number;
}
