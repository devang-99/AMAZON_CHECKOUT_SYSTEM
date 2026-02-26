// shipment-item.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { ShipmentEntity } from './shipment.entity';

@Entity('shipment_items')
export class ShipmentItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  productId: string;

  @Column('int')
  quantity: number;

  @ManyToOne(() => ShipmentEntity, (shipment) => shipment.items, {
    onDelete: 'CASCADE',
  })
  shipment: ShipmentEntity;
}
