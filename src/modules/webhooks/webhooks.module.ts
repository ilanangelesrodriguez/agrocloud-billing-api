import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CulqiModule } from '../../integrations/culqi/culqi.module.js';
import { PaymentsModule } from '../payments/payments.module.js';
import { WebhookEvent, WebhookEventSchema } from './schemas/webhook-event.schema.js';
import { WebhooksController } from './webhooks.controller.js';
import { WebhooksService } from './webhooks.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: WebhookEvent.name, schema: WebhookEventSchema }]),
    CulqiModule,
    PaymentsModule,
  ],
  providers: [WebhooksService],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
