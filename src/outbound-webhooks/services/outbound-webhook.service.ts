import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import {
  WebhookSubscription,
  WebhookSubscriptionDocument,
} from '../schemas/webhook-subscription.schema';
import {
  WebhookDeliveryLog,
  WebhookDeliveryLogDocument,
} from '../schemas/webhook-delivery-log.schema';

export const OUTBOUND_WEBHOOK_QUEUE = 'outbound-webhook-queue';

export interface OutboundWebhookJobPayload {
  tenantId: string;
  subscriptionId: string;
  targetUrl: string;
  secretKey: string;
  eventId: string;
  eventType: string;
  data: Record<string, any>;
  attempt: number;
}

@Injectable()
export class OutboundWebhookService {
  private readonly logger = new Logger(OutboundWebhookService.name);

  constructor(
    @InjectModel(WebhookSubscription.name)
    private readonly subModel: Model<WebhookSubscriptionDocument>,
    @InjectModel(WebhookDeliveryLog.name)
    private readonly logModel: Model<WebhookDeliveryLogDocument>,
    @InjectQueue(OUTBOUND_WEBHOOK_QUEUE)
    private readonly webhookQueue: Queue,
  ) {}

  /**
   * Broadcast an event to all registered and active campus subsystems
   */
  async dispatchEvent(
    tenantId: string,
    eventType: string,
    eventData: Record<string, any>,
  ): Promise<number> {
    const subscriptions = await this.subModel.find({
      tenantId,
      isActive: true,
      subscribedEvents: eventType,
    });

    if (subscriptions.length === 0) {
      this.logger.log(`No active webhook subscribers found for event '${eventType}' in tenant '${tenantId}'`);
      return 0;
    }

    const eventId = `EVT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    for (const sub of subscriptions) {
      const payload: OutboundWebhookJobPayload = {
        tenantId,
        subscriptionId: sub._id.toString(),
        targetUrl: sub.targetUrl,
        secretKey: sub.secretKey,
        eventId,
        eventType,
        data: eventData,
        attempt: 1,
      };

      await this.webhookQueue.add('deliver-webhook-job', payload, {
        attempts: 6,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      });
    }

    this.logger.log(
      `Dispatched event '${eventType}' (${eventId}) to ${subscriptions.length} campus subsystems.`,
    );

    return subscriptions.length;
  }

  /**
   * Register a new webhook subscriber endpoint
   */
  async createSubscription(data: Partial<WebhookSubscription>): Promise<WebhookSubscription> {
    return this.subModel.create({
      ...data,
      secretKey: data.secretKey || `whsec_${crypto.randomBytes(16).toString('hex')}`,
      isActive: data.isActive ?? true,
    });
  }

  /**
   * List subscriptions
   */
  async listSubscriptions(tenantId: string): Promise<WebhookSubscription[]> {
    return this.subModel.find({ tenantId });
  }

  /**
   * List delivery logs
   */
  async listDeliveries(tenantId: string, limit: number = 50): Promise<WebhookDeliveryLog[]> {
    return this.logModel.find({ tenantId }).sort({ createdAt: -1 }).limit(limit);
  }

  /**
   * Admin Replay: Manually replay a dead-letter delivery attempt
   */
  async replayDelivery(deliveryId: string): Promise<{ success: boolean; message: string }> {
    const log = await this.logModel.findById(deliveryId);
    if (!log) {
      throw new NotFoundException(`Webhook delivery log '${deliveryId}' not found.`);
    }

    const sub = await this.subModel.findById(log.subscriptionId);
    if (!sub) {
      throw new NotFoundException(`Associated webhook subscription not found.`);
    }

    const payload: OutboundWebhookJobPayload = {
      tenantId: log.tenantId,
      subscriptionId: sub._id.toString(),
      targetUrl: sub.targetUrl,
      secretKey: sub.secretKey,
      eventId: log.eventId,
      eventType: log.eventType,
      data: log.payload,
      attempt: log.attemptCount + 1,
    };

    await this.webhookQueue.add('deliver-webhook-job', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false,
    });

    log.status = 'PENDING_RETRY';
    await log.save();

    this.logger.log(`Replay queued for delivery '${deliveryId}' to ${sub.targetUrl}`);

    return {
      success: true,
      message: `Delivery '${deliveryId}' re-queued successfully for execution.`,
    };
  }
}

