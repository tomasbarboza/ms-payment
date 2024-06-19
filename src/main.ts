import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { envs } from './config';

async function bootstrap() {
  const logger = new Logger('ms-payments')
  const app = await NestFactory.create(AppModule, 
    {rawBody: true}
  );

  // use class validator global pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,

  }))

  // use global prefix api 
  // todo: delete global prefix
  app.setGlobalPrefix('api');
  await app.listen(envs.port);
  logger.log(`Payment Microservices is running on: ${envs.port} `);
}
bootstrap();
