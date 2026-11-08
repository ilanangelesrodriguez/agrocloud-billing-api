import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CulqiModule } from '../culqi/culqi.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { OutboxModule } from '../outbox/outbox.module.js';
import { PaymentAttempt, PaymentAttemptSchema } from './payment-attempt.schema.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
@Module({
  imports: [MongooseModule.forFeature([{ name: PaymentAttempt.name, schema: PaymentAttemptSchema }]), OrdersModule, CulqiModule, OutboxModule],
  controllers: [PaymentsController], providers: [PaymentsService], exports: [PaymentsService],
})
export class PaymentsModule {}
