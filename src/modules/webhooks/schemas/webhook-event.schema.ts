import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'webhook_events', timestamps: true, versionKey: false })
export class WebhookEvent {
  @Prop({ required: true, unique: true }) providerEventId!: string;

  @Prop({ required: true }) type!: string;

  @Prop({ required: true, enum: ['RECEIVED', 'PROCESSED', 'IGNORED', 'REVIEW'] }) status!: string;

  @Prop() providerObjectId?: string;

  @Prop() note?: string;
}

export const WebhookEventSchema = SchemaFactory.createForClass(WebhookEvent);
