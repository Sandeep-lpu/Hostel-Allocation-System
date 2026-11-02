import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { getQueueToken } from '@nestjs/bullmq';
import {
  OutboundWebhookService,
  OUTBOUND_WEBHOOK_QUEUE,
} from './outbound-webhook.service';
import { WebhookSubscription } from '../schemas/webhook-subscription.schema';
import { WebhookDeliveryLog } from '../schemas/webhook-delivery-log.schema';

describe('OutboundWebhookService', () => {
  let service: OutboundWebhookService;
  let mockSubModel: any;
  let mockLogModel: any;
  let mockQueue: any;

  beforeEach(async () => {
    mockSubModel = {
      find: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };
    mockLogModel = {
      find: jest.fn(),
      findById: jest.fn(),
    };
    mockQueue = {
      add: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboundWebhookService,
        { provide: getModelToken(WebhookSubscription.name), useValue: mockSubModel },
        { provide: getModelToken(WebhookDeliveryLog.name), useValue: mockLogModel },
        { provide: getQueueToken(OUTBOUND_WEBHOOK_QUEUE), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<OutboundWebhookService>(OutboundWebhookService);
  });

  it('should dispatch events to active subscribers matching eventType', async () => {
    mockSubModel.find.mockResolvedValueOnce([
      {
        _id: 'sub_turnstile_01',
        name: 'Turnstile RFID API',
        targetUrl: 'https://campus.edu/api/turnstile',
        secretKey: 'secret_123',
      },
      {
        _id: 'sub_erp_02',
        name: 'Finance ERP API',
        targetUrl: 'https://campus.edu/api/finance',
        secretKey: 'secret_456',
      },
    ]);

    const count = await service.dispatchEvent('univ-delhi-hostel', 'allocation.confirmed', {
      cartId: 'cart_001',
      studentId: 'STU-100',
    });

    expect(count).toBe(2);
    expect(mockQueue.add).toHaveBeenCalledTimes(2);
    expect(mockQueue.add).toHaveBeenCalledWith(
      'deliver-webhook-job',
      expect.objectContaining({
        eventType: 'allocation.confirmed',
        subscriptionId: 'sub_turnstile_01',
      }),
      expect.any(Object),
    );
  });
});

