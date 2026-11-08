import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CulqiModule } from '../culqi/culqi.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { Refund, RefundSchema } from './refund.schema.js';
import { RefundsController } from './refunds.controller.js';
import { RefundsService } from './refunds.service.js';
@Module({ imports: [MongooseModule.forFeature([{ name: Refund.name, schema: RefundSchema }]), OrdersModule, CulqiModule],
  providers: [RefundsService], controllers: [RefundsController] })
export class RefundsModule {}
