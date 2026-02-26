import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppDataSource } from './config/datasource';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  await AppDataSource.initialize();

  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(3000);
  console.log(`Billing Service running on port ${3000}`);
}
void bootstrap();
