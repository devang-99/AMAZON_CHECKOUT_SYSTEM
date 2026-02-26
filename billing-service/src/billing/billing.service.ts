/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { Account } from './entities/account.entity';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { Refund } from './entities/refund.entity';

import { InboxEvent } from './inbox/inbox.entity';
import { OutboxEvent } from './outbox/outbox.entity';

@Injectable()
export class BillingService {
  constructor(private readonly dataSource: DataSource) {}

  async processEvent(routingKey: string, message: any): Promise<void> {
    const { eventId, payload } = message;

    if (!eventId || !payload) throw new Error('Invalid event envelope');

    await this.dataSource.transaction(async (manager) => {
      const inboxRepo = manager.getRepository(InboxEvent);

      const exists = await inboxRepo.findOne({ where: { eventId } });
      if (exists) {
        console.log('Duplicate event ignored:', eventId);
        return;
      }

      if (routingKey === 'order.created') {
        await this.handleOrderCreated(manager, payload);
      }

      if (routingKey === 'order.refund.requested') {
        await this.handleRefundRequested(manager, payload);
      }

      await inboxRepo.save({
        eventId,
        eventType: routingKey,
      });
    });
  }

  private async handleOrderCreated(manager: EntityManager, event: any) {
    const { orderId, customerId, totalAmount } = event;

    console.log('Processing payment for order:', orderId);

    let account = await manager.findOne(Account, {
      where: { customerId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!account) {
      account = manager.create(Account, { customerId, balance: 0 });
      await manager.save(account);
    }

    if (Number(account.balance) < Number(totalAmount)) {
      await manager.save(
        manager.create(Payment, {
          orderId,
          customerId,
          accountId: account.id,
          amount: totalAmount,
          status: PaymentStatus.FAILED,
        }),
      );

      await this.writeOutbox(manager, 'payment.failed', {
        orderId,
        customerId,
        amount: totalAmount,
      });

      console.log('Payment failed');
      return;
    }

    account.balance -= Number(totalAmount);
    await manager.save(account);

    await manager.save(
      manager.create(Payment, {
        orderId,
        customerId,
        accountId: account.id,
        amount: totalAmount,
        status: PaymentStatus.SUCCESS,
      }),
    );

    await this.writeOutbox(manager, 'order.billed', {
      orderId,
      customerId,
      amount: totalAmount,
    });

    console.log('Payment successful');
  }

  private async handleRefundRequested(manager: EntityManager, event: any) {
    console.log(event);
    const { orderId } = event;

    console.log('Processing refund for order:', orderId);

    const payment = await manager.findOne(Payment, {
      where: { orderId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!payment) throw new Error('Payment not found');

    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new Error('Payment not eligible for refund');
    }

    const account = await manager.findOne(Account, {
      where: { id: payment.accountId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!account) throw new Error('Account not found');
    console.log(account.balance);
    console.log(payment.amount);
    account.balance += Number(payment.amount);
    await manager.save(account);

    payment.status = PaymentStatus.REFUNDED;
    await manager.save(payment);

    await manager.save(
      manager.create(Refund, {
        orderId,
        paymentId: payment.id,
        customerId: payment.customerId,
        amount: payment.amount,
      }),
    );

    await this.writeOutbox(manager, 'order.refunded', {
      orderId,
      customerId: payment.customerId,
      amount: payment.amount,
    });

    console.log('Refund completed');
  }

  private async writeOutbox(
    manager: EntityManager,
    eventType: string,
    payload: any,
  ) {
    const event = manager.create(OutboxEvent, {
      eventType,
      payload,
      processed: false,
    });

    await manager.save(event);
  }
}
