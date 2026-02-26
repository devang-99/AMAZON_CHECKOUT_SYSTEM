/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { ShipmentEntity } from '../entities/shipment.entity';
import { InventoryService } from './inventory.service';
import { ProcessedOrderEntity } from '../entities/processed-order.entity';
import { ShipmentLifecycleService } from './shipment-lifecycle';
import { ShippingPublisher } from '../publishers/shipping.publisher'; // ⭐ ADD
import { ShipmentStatus } from 'src/common/enums/shipment-status.enum';

@Injectable()
export class ShippingService {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly shipmentLifecycle: ShipmentLifecycleService,
    private readonly publisher: ShippingPublisher, // ⭐ ADD
    private readonly dataSource: DataSource,

    @InjectRepository(ShipmentEntity)
    private shipmentRepo: Repository<ShipmentEntity>,

    @InjectRepository(ProcessedOrderEntity)
    private processedOrderRepo: Repository<ProcessedOrderEntity>,
  ) {}

  async handleOrderCreated(order: any) {
    let record = await this.processedOrderRepo.findOne({
      where: { orderId: order.orderId },
    });

    if (!record) {
      record = this.processedOrderRepo.create({
        orderId: order.orderId,
        items: order.items,
        orderPlacedReceived: true,
        orderBilledReceived: false,
      });
    } else {
      record.orderPlacedReceived = true;
      record.items = order.items;
    }

    await this.processedOrderRepo.save(record);
    await this.tryCreateShipment(order.orderId);
  }

  async handleOrderBilled(order: any) {
    let record = await this.processedOrderRepo.findOne({
      where: { orderId: order.orderId },
    });

    if (!record) {
      record = this.processedOrderRepo.create({
        orderId: order.orderId,
        items: [],
        orderPlacedReceived: false,
        orderBilledReceived: true,
      });
    } else {
      record.orderBilledReceived = true;
    }

    await this.processedOrderRepo.save(record);
    await this.tryCreateShipment(order.orderId);
  }

  private async tryCreateShipment(orderId: string) {
    const record = await this.processedOrderRepo.findOne({
      where: { orderId },
    });

    if (!record) return;
    if (!record.orderPlacedReceived || !record.orderBilledReceived) return;

    const existing = await this.shipmentRepo.findOne({
      where: { orderId },
    });
    if (existing) return;

    await this.dataSource.transaction(async (manager) => {
      await this.inventoryService.reserveStock(record.items, manager);

      const shipment = this.shipmentLifecycle.createShipmentEntity(
        orderId,
        record.items,
      );

      await manager.save(shipment);

      // ⭐⭐⭐ CRITICAL — WRITE EVENT TO OUTBOX
      await this.publisher.publishShippingCreated({
        orderId,
        trackingNumber: shipment.trackingNumber,
      });
    });
  }

  async getShipmentByOrderId(orderId: string) {
    const shipment = await this.shipmentRepo.findOne({
      where: { orderId },
      relations: ['items'],
    });

    if (!shipment) throw new NotFoundException('Shipment not found');
    return shipment;
  }

  async seedInventory(items: any[]) {
    return this.inventoryService.seedInventory(items);
  }

async updateShipmentStatus(orderId: string, status: ShipmentStatus){
    return this.shipmentLifecycle.updateStatus(orderId, status);
  }
}
