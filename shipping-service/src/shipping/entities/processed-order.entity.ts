// processed-order.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('processed_orders')
export class ProcessedOrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  orderId: string;

  @Column('jsonb', { nullable: true })
  items: any[];

  @Column({ default: false })
  orderPlacedReceived: boolean;

  @Column({ default: false })
  orderBilledReceived: boolean;
}
