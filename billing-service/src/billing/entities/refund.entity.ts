import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('refunds')
export class Refund {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @Column()
  paymentId: string;

  @Column()
  customerId: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  @CreateDateColumn()
  createdAt: Date;
}