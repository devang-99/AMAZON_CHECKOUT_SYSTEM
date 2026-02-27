/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { OrdersGateway } from '../websocket/orders.gateway';
import { Order, OrderStatus } from './entities/order.entity';
import { InboxEvent } from '../inbox/inbox.entity';
import { OutboxEvent } from '../outbox/outbox.entity';
import { OrderStatusEvent } from 'src/types/order-status-event.type';

@Injectable()
export class OrdersService {
  constructor(
    private gateway: OrdersGateway,
    private dataSource: DataSource,

    @InjectRepository(Order)
    private orderRepo: Repository<Order>,

    @InjectRepository(InboxEvent)
    private inboxRepo: Repository<InboxEvent>,
  ) {}


  async getAllOrders() {
    return this.orderRepo.find();
  }

  async getOrder(orderId: string) {
    return this.orderRepo.findOneBy({ id: orderId });
  }

  // =====================================================
  // CREATE ORDER
  // =====================================================

  async createOrder(customerId: string, items: any[]) {
    return this.dataSource.transaction(async (manager) => {
      // price snapshot (replace with catalog later)
      const enrichedItems = items.map((item) => {
        const unitPrice = 100;
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

      // OUTBOX EVENT (for billing service)
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

  // =====================================================
  // EVENT HANDLERS (from billing & shipping)
  // =====================================================

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

  // =====================================================
  // INBOX IDEMPOTENCY
  // =====================================================

  private async processEvent(eventId: string, handler: () => Promise<void>) {
    try {
      await this.dataSource.transaction(async (manager) => {
        const exists = await manager.findOne(InboxEvent, {
          where: { eventId },
        });

        if (exists) {
          console.log(`Event ${eventId} already processed`);
          return;
        }

        await handler();

        await manager.save(InboxEvent, {
          eventId,
          processed: true,
        });
      });
    } catch (err: any) {
      if (err.code === '23505') {
        console.log(`Duplicate event ignored: ${eventId}`);
        return;
      }
      throw err;
    }
  }

  // =====================================================
  // STATUS MANAGEMENT
  // =====================================================

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

  // =====================================================
  // ADMIN RESET
  // =====================================================

  async resetDatabase() {
    await this.dataSource.query('TRUNCATE orders CASCADE');
    await this.dataSource.query('TRUNCATE order_items CASCADE');
    await this.dataSource.query('TRUNCATE outbox_events CASCADE');
    await this.dataSource.query('TRUNCATE inbox_events CASCADE');

    return { message: 'Database cleared' };
  }
}