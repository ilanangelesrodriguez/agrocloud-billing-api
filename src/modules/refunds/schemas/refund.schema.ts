import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'refunds', timestamps: true, versionKey: false })
export class Refund {
  @Prop({ required: true, unique: true }) orderReference!: string;

  @Prop({ required: true }) chargeId!: string;

  @Prop({ required: true }) amountCents!: number;

  @Prop({ required: true }) reason!: string;

  @Prop({ required: true, default: 'PROCESSING' }) status!: string;

  @Prop() providerRefundId?: string;
}

export const RefundSchema = SchemaFactory.createForClass(Refund);
