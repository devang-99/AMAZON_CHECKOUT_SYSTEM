// src/billing/billing.controller.ts

import { Controller, Get, Param, Post, Body, Delete } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';

import { BillingService } from './billing.service';
import { RabbitMQPublisher } from './messaging/rabbitmq.publisher';
import { Account } from './entities/account.entity';
import { RefundDto } from './dto/refund.dto';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly publisher: RabbitMQPublisher,
    private readonly dataSource: DataSource,
  ) {}

  @Get('accounts/:customerId')
  async getAccount(@Param('customerId') customerId: string) {
    const account = await this.dataSource
      .getRepository(Account)
      .findOne({ where: { customerId } });

    if (!account) return { message: 'Account not found' };

    return account;
  }

  @Post('refunds')
  async refund(@Body() dto: RefundDto) {
    await this.publisher.publish('order.refund.requested', {
      eventId: crypto.randomUUID(),
      payload: dto,
    });

    return { message: 'Refund requested' };
  }

  @Delete('reset')
  async reset() {
    const entities = this.dataSource.entityMetadatas;

    for (const entity of entities) {
      const repo = this.dataSource.getRepository(entity.name);
      await repo.clear();
    }

    return { message: 'Billing database cleared' };
  }

@Post('accounts/seed')
async seedAccount(
  @Body() body: { customerId: string; balance: number; cardNumber: string },
) {
  const repo = this.dataSource.getRepository(Account);

  const existing = await repo.findOne({
    where: { customerId: body.customerId },
  });

  if (existing) return existing;

  const account = repo.create(body);
  return repo.save(account);
}
}
