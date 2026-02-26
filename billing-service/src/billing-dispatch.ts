import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { OutboxProcessor } from './billing/outbox/outbox.processor';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const processor = app.get(OutboxProcessor);
  await processor.process();

  await app.close();
}

void run();
