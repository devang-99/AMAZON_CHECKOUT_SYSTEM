import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

dotenv.config();
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(5000);
  console.log(`Shipping Service running on port ${5000}`);
}
void bootstrap();
