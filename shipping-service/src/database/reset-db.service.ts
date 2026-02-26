import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class ResetDbService {
  constructor(private readonly dataSource: DataSource) {}

  async reset() {
    const tables = [
      'shipment_items',
      'shipments',
      'inventory',
      'processed_orders',
      'inbox_events',
      'outbox_events',
    ];

    for (const table of tables) {
      await this.dataSource.query(
        `TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`,
      );
    }

    return { message: 'Database reset successful' };
  }
}
