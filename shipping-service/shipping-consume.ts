/* eslint-disable @typescript-eslint/no-unsafe-call */
import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app.module';
import { OrderBilledConsumer } from 'src/shipping/consumers/order-billed.consumer';
import { OrderCreatedConsumer } from 'src/shipping/consumers/order-created.consumer';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const billedConsumer = app.get(OrderBilledConsumer);
  await billedConsumer.start();

  console.log('Shipping consumer started for order.billed');

  const createdConsumer = app.get(OrderCreatedConsumer);
  await createdConsumer.start();

  console.log('Shipping consumers started for order.created');
}

void run();
