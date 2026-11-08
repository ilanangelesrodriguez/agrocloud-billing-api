import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envSchema } from './config/env.validation.js';
import { DatabaseModule } from './infrastructure/database/database.module.js';
import { OutboxModule } from './infrastructure/outbox/outbox.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { OrdersModule } from './modules/orders/orders.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { RefundsModule } from './modules/refunds/refunds.module.js';
import { WebhooksModule } from './modules/webhooks/webhooks.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envSchema }),
    DatabaseModule,
    HealthModule,
    OrdersModule,
    PaymentsModule,
    RefundsModule,
    WebhooksModule,
    OutboxModule,
  ],
})
export class AppModule {}
