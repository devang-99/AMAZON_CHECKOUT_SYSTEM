/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShipmentEntity } from '../entities/shipment.entity';
import { ShipmentItemEntity } from '../entities/shipment-item.entity';
import { ShippingPublisher } from '../publishers/shipping.publisher';
import { ShipmentStatus } from 'src/common/enums/shipment-status.enum';

@Injectable()
export class ShipmentLifecycleService {
  constructor(
    @InjectRepository(ShipmentEntity)
    private shipmentRepo: Repository<ShipmentEntity>,
    private readonly publisher: ShippingPublisher,
  ) {}

  createShipmentEntity(orderId: string, items: any[]) {
    const shipment = new ShipmentEntity();
    shipment.orderId = orderId;
    shipment.status = ShipmentStatus.SHIPPED;
    shipment.trackingNumber = this.generateTrackingNumber();

    shipment.items = items.map((i) => {
      const item = new ShipmentItemEntity();
      item.productId = i.productId;
      item.quantity = i.quantity;
      return item;
    });

    return shipment;
  }

async updateStatus(orderId: string, status: ShipmentStatus) {
  const shipment = await this.shipmentRepo.findOne({ where: { orderId } });
  if (!shipment) throw new NotFoundException('Shipment not found');

  shipment.status = status;
  await this.shipmentRepo.save(shipment);

  if (status === ShipmentStatus.DELIVERED) {
    await this.publisher.publishOrderCompleted({ orderId });
  }

  return shipment;
}

  private generateTrackingNumber(): string {
    return 'TRK-' + Math.random().toString(36).substring(2, 12);
  }
}
  