import { AppDataSource } from './config/datasource';
import { OutboxProcessor } from './outbox/outbox.processor';
import { RabbitPublisher } from './messaging/rabbitmq.publisher';

async function run() {
  await AppDataSource.initialize();

  const publisher = new RabbitPublisher();
  await publisher.onModuleInit();

  const processor = new OutboxProcessor(publisher);

  await processor.process();

  console.log('Sales outbox dispatch complete');

  process.exit(0); // ✅ correct way to stop script
}

run().catch((err) => {
  console.error('Dispatch failed', err);
  process.exit(1);
});