import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WebhookSubscriptionDocument = HydratedDocument<WebhookSubscription>;

@Schema({ timestamps: true, collection: 'webhook_subscriptions' })
export class WebhookSubscription {
  @Prop({ required: true, trim: true, index: true })
  tenantId: string;

  @Prop({ required: true, trim: true })
  name: string; // e.g. "Biometric Gate Turnstile API", "Mess RFID System", "University Finance ERP"

  @Prop({ required: true, trim: true })
  targetUrl: string;

  @Prop({ required: true, trim: true })
  secretKey: string;

  @Prop({
    type: [String],
    required: true,
    default: ['allocation.confirmed'],
    index: true,
  })
  subscribedEvents: string[]; // 'allocation.confirmed', 'allocation.hostel_changed', 'allocation.food_changed', 'allocation.cancelled'

  @Prop({ required: true, default: true, index: true })
  isActive: boolean;
}

export const WebhookSubscriptionSchema = SchemaFactory.createForClass(WebhookSubscription);
WebhookSubscriptionSchema.index({ tenantId: 1, isActive: 1, subscribedEvents: 1 });

