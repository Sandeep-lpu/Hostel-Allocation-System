import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import {
  WebhookSubscription,
  WebhookSubscriptionSchema,
} from './schemas/webhook-subscription.schema';
import {
  WebhookDeliveryLog,
  WebhookDeliveryLogSchema,
} from './schemas/webhook-delivery-log.schema';
import {
  OutboundWebhookService,
  OUTBOUND_WEBHOOK_QUEUE,
} from './services/outbound-webhook.service';
import { OutboundWebhookProcessor } from './processors/outbound-webhook.processor';
import { AdminWebhooksController } from './admin-webhooks.controller';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WebhookSubscription.name, schema: WebhookSubscriptionSchema },
      { name: WebhookDeliveryLog.name, schema: WebhookDeliveryLogSchema },
    ]),
    BullModule.registerQueue({
      name: OUTBOUND_WEBHOOK_QUEUE,
    }),
  ],
  controllers: [AdminWebhooksController],
  providers: [OutboundWebhookService, OutboundWebhookProcessor],
  exports: [OutboundWebhookService],
})
export class OutboundWebhooksModule {}

