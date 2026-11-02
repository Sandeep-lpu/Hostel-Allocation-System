import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Job } from 'bullmq';
import * as crypto from 'crypto';
import {
  WebhookDeliveryLog,
  WebhookDeliveryLogDocument,
} from '../schemas/webhook-delivery-log.schema';
import {
  OUTBOUND_WEBHOOK_QUEUE,
  OutboundWebhookJobPayload,
} from '../services/outbound-webhook.service';

/**
 * BullMQ Outbound Webhook Delivery Worker
 *
 * Distributed Systems Rationale:
 * Guarantees reliable delivery of real-time events to Campus ERP, Turnstiles, and RFID Messes.
 * Uses cryptographic HMAC-SHA256 timestamped signatures, exponential backoff with 6 attempts,
 * and persistent Dead-Letter Logging with manual replay capabilities.
 */
@Processor(OUTBOUND_WEBHOOK_QUEUE, { concurrency: 20 })
export class OutboundWebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(OutboundWebhookProcessor.name);

  constructor(
    @InjectModel(WebhookDeliveryLog.name)
    private readonly logModel: Model<WebhookDeliveryLogDocument>,
  ) {
    super();
  }

  async process(job: Job<OutboundWebhookJobPayload>): Promise<void> {
    const {
      tenantId,
      subscriptionId,
      targetUrl,
      secretKey,
      eventId,
      eventType,
      data,
    } = job.data;

    const currentAttempt = job.attemptsMade + 1;
    const timestamp = Math.floor(Date.now() / 1000);
    const bodyString = JSON.stringify({
      id: eventId,
      event: eventType,
      timestamp,
      tenantId,
      data,
    });

    // Generate cryptographic timestamped signature: t=<timestamp>,v1=<signature>
    const hmacContent = `${timestamp}.${bodyString}`;
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(hmacContent)
      .digest('hex');

    const signatureHeader = `t=${timestamp},v1=${signature}`;
    const startTime = Date.now();

    this.logger.log(
      `[Attempt #${currentAttempt}/6] Delivering '${eventType}' to '${targetUrl}'...`,
    );

    let statusCode: number | null = null;
    let errorMessage: string | null = null;
    let success = false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'HostelAllocation-ERP-Webhook/1.0',
          'X-Hostel-Webhook-Signature': signatureHeader,
          'X-Hostel-Event-Id': eventId,
          'X-Hostel-Event-Type': eventType,
        },
        body: bodyString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      statusCode = response.status;
      success = response.ok;

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        errorMessage = `HTTP ${response.status}: ${text.slice(0, 200)}`;
      }
    } catch (err: any) {
      errorMessage = err.name === 'AbortError' ? 'Request timed out after 5000ms' : err.message;
      success = false;
    }

    const latencyMs = Date.now() - startTime;
    const isFinalAttempt = currentAttempt >= (job.opts.attempts || 6);

    const deliveryStatus = success
      ? 'SUCCESS'
      : isFinalAttempt
      ? 'FAILED_DEAD_LETTER'
      : 'PENDING_RETRY';

    // Persist Delivery Log
    await this.logModel.create({
      tenantId,
      subscriptionId: new Types.ObjectId(subscriptionId),
      targetUrl,
      eventId,
      eventType,
      payload: data,
      attemptCount: currentAttempt,
      statusCode,
      latencyMs,
      status: deliveryStatus,
      errorMessage,
      signature: signatureHeader,
      lastAttemptAt: new Date(),
    });

    if (!success) {
      this.logger.warn(
        `Webhook delivery failed to ${targetUrl} (Attempt #${currentAttempt}): ${errorMessage}`,
      );
      if (!isFinalAttempt) {
        throw new Error(`Webhook delivery failed: ${errorMessage}`);
      } else {
        this.logger.error(
          `Webhook delivery to ${targetUrl} permanently failed after ${currentAttempt} attempts. Moved to Dead-Letter.`,
        );
      }
    } else {
      this.logger.log(
        `Webhook delivered successfully to ${targetUrl} in ${latencyMs}ms (Status: ${statusCode})`,
      );
    }
  }
}

