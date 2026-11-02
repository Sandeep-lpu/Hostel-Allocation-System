import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WebhookDeliveryLogDocument = HydratedDocument<WebhookDeliveryLog>;

@Schema({ timestamps: true, collection: 'webhook_delivery_logs' })
export class WebhookDeliveryLog {
  @Prop({ required: true, trim: true, index: true })
  tenantId: string;

  @Prop({ type: Types.ObjectId, ref: 'WebhookSubscription', required: true, index: true })
  subscriptionId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  targetUrl: string;

  @Prop({ required: true, trim: true, index: true })
  eventId: string;

  @Prop({ required: true, trim: true, index: true })
  eventType: string;

  @Prop({ type: Object, required: true })
  payload: Record<string, any>;

  @Prop({ required: true, default: 1 })
  attemptCount: number;

  @Prop({ default: null })
  statusCode?: number | null;

  @Prop({ default: null })
  latencyMs?: number | null;

  @Prop({
    required: true,
    enum: ['SUCCESS', 'PENDING_RETRY', 'FAILED_DEAD_LETTER'],
    default: 'PENDING_RETRY',
    index: true,
  })
  status: string;

  @Prop({ default: null })
  errorMessage?: string | null;

  @Prop({ required: true })
  signature: string;

  @Prop({ required: true, default: Date.now })
  lastAttemptAt: Date;
}

export const WebhookDeliveryLogSchema = SchemaFactory.createForClass(WebhookDeliveryLog);
WebhookDeliveryLogSchema.index({ tenantId: 1, eventType: 1, status: 1 });
WebhookDeliveryLogSchema.index({ eventId: 1, subscriptionId: 1 });

