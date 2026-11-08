import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OrderDocument = HydratedDocument<BillingOrder>;

export type OrderKind = 'PLAN' | 'RENEWAL' | 'USER_ADDON' | 'AI_ADDON' | 'LOT_ADDON';

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'UNKNOWN' | 'REFUNDED';

@Schema({ collection: 'payment_orders', timestamps: true, versionKey: false })
export class BillingOrder {
  @Prop({ required: true, unique: true, trim: true }) externalReference!: string;

  @Prop({ required: true, index: true }) companyId!: number;

  @Prop({ required: true, enum: ['PLAN', 'RENEWAL', 'USER_ADDON', 'AI_ADDON', 'LOT_ADDON'] })
  kind!: OrderKind;

  @Prop({ required: true, min: 100 }) amountCents!: number;

  @Prop({ required: true, enum: ['PEN'] }) currency!: 'PEN';

  @Prop({ required: true }) customerEmail!: string;

  @Prop({ required: true }) description!: string;

  @Prop({
    required: true,
    enum: ['PENDING', 'PROCESSING', 'PAID', 'UNKNOWN', 'REFUNDED'],
    default: 'PENDING',
    index: true,
  })
  status!: OrderStatus;

  @Prop() culqiChargeId?: string;

  @Prop() culqiOrderId?: string;

  @Prop() paidAt?: Date;
}

export const BillingOrderSchema = SchemaFactory.createForClass(BillingOrder);
