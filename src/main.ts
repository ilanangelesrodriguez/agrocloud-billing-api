import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { rawBody: true, bodyParser: true });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableShutdownHooks();
  const swagger = new DocumentBuilder()
    .setTitle('AgroCloud Billing API')
    .setDescription('Órdenes, pagos y eventos Culqi para AgroCloud. Acceso privado entre servicios.')
    .setVersion('0.1.0')
    .addApiKey({ type: 'apiKey', in: 'header', name: 'x-service-key' }, 'service-key')
    .build();
  if (process.env.NODE_ENV !== 'production') {
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger));
  }
  await app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0');
}
bootstrap().catch((error: unknown) => {
  console.error('AgroCloud Billing API no pudo iniciar:', error);
  process.exitCode = 1;
});
