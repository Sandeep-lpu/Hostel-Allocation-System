import { Injectable, OnModuleInit } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry: client.Registry;

  // Custom Gauges, Counters & Histograms
  public readonly waitingRoomQueueSize: client.Gauge<string>;
  public readonly activeShoppersCount: client.Gauge<string>;
  public readonly availableBedsTotal: client.Gauge<'categoryCode' | 'blockCode'>;
  public readonly bookingTransactionsTotal: client.Counter<'status' | 'bookingType'>;
  public readonly pdfGenerationDuration: client.Histogram<string>;

  constructor() {
    this.registry = new client.Registry();

    // Enable standard Node.js & process runtime metrics (event loop, heap, GC)
    client.collectDefaultMetrics({ register: this.registry, prefix: 'hostel_node_' });

    this.waitingRoomQueueSize = new client.Gauge({
      name: 'hostel_waiting_room_queue_size',
      help: 'Current count of students waiting in Phase 1 Virtual Waiting Room Sorted Sets',
      registers: [this.registry],
    });

    this.activeShoppersCount = new client.Gauge({
      name: 'hostel_active_shoppers_count',
      help: 'Count of active admitted shoppers holding active passes or carts',
      registers: [this.registry],
    });

    this.availableBedsTotal = new client.Gauge({
      name: 'hostel_available_beds_total',
      help: 'Real-time available bed count partitioned by category and hostel block',
      labelNames: ['categoryCode', 'blockCode'],
      registers: [this.registry],
    });

    this.bookingTransactionsTotal = new client.Counter({
      name: 'hostel_booking_transactions_total',
      help: 'Cumulative count of booking transactions committed or conflicted',
      labelNames: ['status', 'bookingType'],
      registers: [this.registry],
    });

    this.pdfGenerationDuration = new client.Histogram({
      name: 'hostel_pdf_generation_duration_seconds',
      help: 'Time taken to render HTML-to-PDF allotment slips via warm Chromium page pool',
      buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });
  }

  onModuleInit(): void {
    // Initial gauge baseline
    this.waitingRoomQueueSize.set(0);
    this.activeShoppersCount.set(0);
  }

  /**
   * Return Prometheus formatted exposition metrics
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }
}

