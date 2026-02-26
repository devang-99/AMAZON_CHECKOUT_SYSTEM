import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ShippingModule } from './shipping/shipping.module';

import { InboxEntity } from './messaging/inbox/inbox.entity';
import { OutboxEntity } from './messaging/outbox/outbox.entity';

import { ShipmentEntity } from './shipping/entities/shipment.entity';
import { ShipmentItemEntity } from './shipping/entities/shipment-item.entity';
import { InventoryEntity } from './shipping/entities/inventory.entity';
import { ProcessedOrderEntity } from './shipping/entities/processed-order.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: Number(config.get('DB_PORT')),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_NAME'),

        entities: [
          ShipmentEntity,
          ShipmentItemEntity,
          InventoryEntity,
          ProcessedOrderEntity,
          InboxEntity,
          OutboxEntity,
        ],

        synchronize: true,
        logging: false,
      }),
    }),

    ShippingModule,
  ],
})
export class AppModule {}
