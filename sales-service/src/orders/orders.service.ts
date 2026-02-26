/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { AppDataSource } from '../config/datasource';
import { OutboxEvent } from '../outbox/outbox.entity';
import { InboxEvent } from '../inbox/inbox.entity';
import { OrdersGateway } from '../websocket/orders.gateway';
import { Order } from './entities/order.entity';
import { OrderStatus } from './entities/order.entity';
import { v4 as uuid } from 'uuid';
import { OrderStatusEvent } from 'src/types/order-status-event.type';

@Injectable()
export class OrdersService {
  constructor(private gateway: OrdersGateway) {}

  private orderRepo = AppDataSource.getRepository(Order);
  private inboxRepo = AppDataSource.getRepository(InboxEvent);

  // ---------------------------
  // READ OPERATIONS
  // ---------------------------

  async getAllOrders() {
    return this.orderRepo.find();
  }

  async getOrder(orderId: string) {
    return this.orderRepo.findOneBy({ id: orderId });
  }

  // ---------------------------
  // CREATE ORDER (UPDATED)
  // ---------------------------

  async createOrder(customerId: string, items: any[]) {
    return AppDataSource.transaction(async (manager) => {
      // Enrich items with price snapshot
      // Replace static pricing later with catalog service call
      const enrichedItems = items.map((item) => {
        const unitPrice = 100; // placeholder price
        const totalPrice = unitPrice * item.quantity;

        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice,
          totalPrice,
        };
      });

      const subtotal = enrichedItems.reduce(
        (sum, item) => sum + item.totalPrice,
        0,
      );

      const taxAmount = subtotal * 0.18;
      const shippingAmount = subtotal > 1000 ? 0 : 50;
      const totalAmount = subtotal + taxAmount + shippingAmount;

      const order = manager.create(Order, {
        customerId,
        subtotal,
        taxAmount,
        shippingAmount,
        totalAmount,
        status: OrderStatus.CREATED,
        items: enrichedItems,
      });

      await manager.save(order);

      // Outbox event (same structure as before)
      await manager.save(OutboxEvent, {
        id: uuid(),
        type: 'order.created',
        payload: {
          orderId: order.id,
          customerId: order.customerId,
          totalAmount: order.totalAmount,
          items: enrichedItems,
        },
      });

      this.gateway.orderCreated(order);

      return order;
    });
  }

  // ---------------------------
  // EVENT HANDLERS
  // ---------------------------

  async handleOrderBilled(event: OrderStatusEvent) {
    await this.processEvent(event.eventId, async () => {
      await this.updateStatus(event.orderId, OrderStatus.BILLED);
    });
  }

  async handlePaymentFailed(event: OrderStatusEvent) {
    await this.processEvent(event.eventId, async () => {
      await this.updateStatus(event.orderId, OrderStatus.FAILED);
    });
  }

  async handleShippingCreated(event: OrderStatusEvent) {
    await this.processEvent(event.eventId, async () => {
      await this.updateStatus(event.orderId, OrderStatus.SHIPPING);
    });
  }

  async handleOrderCompleted(event: OrderStatusEvent) {
    await this.processEvent(event.eventId, async () => {
      await this.updateStatus(event.orderId, OrderStatus.COMPLETED);
    });
  }

  async handleOrderRefunded(event: OrderStatusEvent) {
    await this.processEvent(event.eventId, async () => {
      await this.updateStatus(event.orderId, OrderStatus.REFUNDED);
    });
  }

  // ---------------------------
  // INBOX IDEMPOTENCY
  // ---------------------------

  private async processEvent(eventId: string, handler: () => Promise<void>) {
    try {
      await AppDataSource.transaction(async (manager) => {
        await handler();

        const exists = await manager.findOne(InboxEvent, {
          where: { eventId },
        });

        if (!exists) {
          await manager.save(InboxEvent, { eventId });
        }
      });
    } catch (err) {
      if (err.code === '23505') {
        console.log(`Event ${eventId} already processed.`);
        return;
      }
      throw err;
    }
  }

  // ---------------------------
  // STATUS MANAGEMENT
  // ---------------------------

  private async updateStatus(orderId: string, newStatus: OrderStatus) {
    const order = await this.orderRepo.findOneBy({ id: orderId });
    if (!order) return;

    if (!this.isValidTransition(order.status, newStatus)) {
      console.log(`Invalid transition ${order.status} -> ${newStatus}`);
      return;
    }

    order.status = newStatus;
    await this.orderRepo.save(order);

    this.gateway.orderUpdated(order);
  }

  private isValidTransition(current: OrderStatus, next: OrderStatus): boolean {
    const transitions: Record<OrderStatus, OrderStatus[]> = {
      CREATED: [OrderStatus.BILLED, OrderStatus.FAILED],
      BILLED: [OrderStatus.SHIPPING, OrderStatus.REFUNDED],
      SHIPPING: [OrderStatus.COMPLETED],
      COMPLETED: [],
      FAILED: [],
      REFUNDED: [],
    };

    return transitions[current].includes(next);
  }

  // ---------------------------
  // ADMIN RESET
  // ---------------------------

  async resetDatabase() {
    await AppDataSource.query('TRUNCATE orders CASCADE');
    await AppDataSource.query('TRUNCATE order_items CASCADE');
    await AppDataSource.query('TRUNCATE outbox_events CASCADE');
    await AppDataSource.query('TRUNCATE inbox_events CASCADE');

    return { message: 'Database cleared' };
  }
}
