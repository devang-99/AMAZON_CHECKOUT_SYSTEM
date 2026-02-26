/* eslint-disable @typescript-eslint/no-unsafe-call */
import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app.module';
import { OutboxProcessor } from 'src/messaging/outbox/outbox.processor';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const processor = app.get(OutboxProcessor);
  await processor.process();

  await app.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
