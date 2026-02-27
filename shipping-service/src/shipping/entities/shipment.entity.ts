// shipment.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { ShipmentItemEntity } from './shipment-item.entity';
import { ShipmentStatus } from 'src/common/enums/shipment-status.enum';

@Entity('shipments')
export class ShipmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  orderId: string;

  @Column({
    type: 'enum',
    enum: ShipmentStatus,
  })
  status: ShipmentStatus;

  @Column()
  trackingNumber: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => ShipmentItemEntity, (item) => item.shipment, {
    cascade: true,
    eager: true,
  })
  items: ShipmentItemEntity[];
}
