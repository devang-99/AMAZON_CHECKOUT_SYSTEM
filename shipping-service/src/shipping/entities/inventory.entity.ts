// inventory.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('inventory')
export class InventoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  productId: string;

  @Column('int')
  quantityAvailable: number;
}
