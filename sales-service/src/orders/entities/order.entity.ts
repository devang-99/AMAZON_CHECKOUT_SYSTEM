import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  CREATED = 'CREATED',
  BILLED = 'BILLED',
  SHIPPING = 'SHIPPING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  customerId: string;

  @OneToMany(() => OrderItem, (item) => item.order, {
    cascade: true,
    eager: true,
  })
  items: OrderItem[];

  // pricing
  @Column('decimal')
  subtotal: number;

  @Column('decimal', { default: 0 })
  taxAmount: number;

  @Column('decimal', { default: 0 })
  shippingAmount: number;

  @Column('decimal')
  totalAmount: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.CREATED,
  })
  status: OrderStatus;

  // references to other microservices
  @Column({ nullable: true })
  billingId?: string;

  @Column({ nullable: true })
  shipmentId?: string;

  @CreateDateColumn()
  createdAt: Date;
}