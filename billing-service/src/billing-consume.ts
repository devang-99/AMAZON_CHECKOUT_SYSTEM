import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BillingConsumer } from './billing/messaging/billing.consumer';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const consumer = app.get(BillingConsumer);
  await consumer.start();
}

void run();
