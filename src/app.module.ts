import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { envSchema } from './config/env.js';
import { HealthController } from './modules/health/health.controller.js';
import { OrdersModule } from './modules/orders/orders.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { CulqiModule } from './modules/culqi/culqi.module.js';
import { OutboxModule } from './modules/outbox/outbox.module.js';
import { WebhooksModule } from './modules/webhooks/webhooks.module.js';
import { RefundsModule } from './modules/refunds/refunds.module.js';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envSchema }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
        retryAttempts: 2, retryDelay: 1000, serverSelectionTimeoutMS: 8000,
      }),
    }),
    OrdersModule, PaymentsModule, CulqiModule, OutboxModule, WebhooksModule, RefundsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
