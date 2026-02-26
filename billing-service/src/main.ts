import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AppDataSource } from './config/datasource';

async function bootstrap() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected successfully');

    const app = await NestFactory.create(AppModule);

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.listen(4000);

    console.log(`Billing Service running on port ${4000}`);
  } catch (error) {
    console.error(' Failed to start Billing Service');
    console.error(error);
    process.exit(1);
  }
}

void bootstrap();
