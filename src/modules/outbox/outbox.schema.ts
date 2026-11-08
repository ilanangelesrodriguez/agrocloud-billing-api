import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
@Schema({ collection: "outbound_events", timestamps: true, versionKey: false })
export class OutboundEvent {
  @Prop({ required: true, unique: true }) eventKey!: string;
  @Prop({ required: true }) eventType!: string;
  @Prop({ required: true, type: Object }) payload!: Record<string, unknown>;
  @Prop({ required: true, default: "PENDING", enum: ["PENDING", "DELIVERED"] })
  status!: "PENDING" | "DELIVERED";
  @Prop({ required: true, default: 0 }) attempts!: number;
  @Prop() lastError?: string;
  @Prop({ default: Date.now }) nextAttemptAt!: Date;
  @Prop() lockedUntil?: Date;
  @Prop() lockToken?: string;
  @Prop() deliveredAt?: Date;
}
export const OutboundEventSchema = SchemaFactory.createForClass(OutboundEvent);

OutboundEventSchema.index({ status: 1, nextAttemptAt: 1, createdAt: 1 });
