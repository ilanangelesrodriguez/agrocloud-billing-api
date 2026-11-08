import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'payment_attempts', timestamps: true, versionKey: false })
export class PaymentAttempt {
  @Prop({ required: true, index: true }) orderReference!: string;

  @Prop({
    required: true,
    enum: ['PROCESSING', 'SUCCEEDED', 'DECLINED', 'UNKNOWN'],
  })
  status!: string;

  @Prop() culqiChargeId?: string;

  @Prop() errorCode?: string;
}

export const PaymentAttemptSchema = SchemaFactory.createForClass(PaymentAttempt);

PaymentAttemptSchema.index({ orderReference: 1, createdAt: -1 });
