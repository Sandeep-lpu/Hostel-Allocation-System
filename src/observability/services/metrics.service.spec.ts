import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsService],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  it('should initialize and register custom Prometheus metrics', async () => {
    expect(service.waitingRoomQueueSize).toBeDefined();
    expect(service.activeShoppersCount).toBeDefined();
    expect(service.availableBedsTotal).toBeDefined();
    expect(service.bookingTransactionsTotal).toBeDefined();
    expect(service.pdfGenerationDuration).toBeDefined();

    service.waitingRoomQueueSize.set(42);
    service.bookingTransactionsTotal.inc({ status: 'CONFIRMED', bookingType: 'FRESH_ALLOCATION' });

    const metricsOutput = await service.getMetrics();
    expect(metricsOutput).toContain('hostel_waiting_room_queue_size 42');
    expect(metricsOutput).toContain('hostel_booking_transactions_total{status="CONFIRMED",bookingType="FRESH_ALLOCATION"} 1');
  });
});

