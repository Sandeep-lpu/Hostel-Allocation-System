import { Controller, Get, Res } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  MongooseHealthIndicator,
} from '@nestjs/terminus';
import { FastifyReply } from 'fastify';
import { MetricsService } from './services/metrics.service';
import { VwrRedisService } from '../waiting-room/redis/redis.service';
import { PuppeteerPoolService } from '../documents/services/puppeteer-pool.service';

@Controller()
export class ObservabilityController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly mongooseHealth: MongooseHealthIndicator,
    private readonly redisService: VwrRedisService,
    private readonly puppeteerPool: PuppeteerPoolService,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Production Health Check
   * Probes MongoDB Replica Set primary, Redis 7 ping, and warm Chromium browser pool.
   * Exposed at both /health and /api/v1/health.
   */
  @Get(['health', 'api/v1/health'])
  @HealthCheck()
  async checkHealth() {
    return this.health.check([
      // 1. MongoDB Replica Set
      () => this.mongooseHealth.pingCheck('mongodb'),

      // 2. Redis In-Memory Store
      async () => {
        try {
          const pong = await this.redisService.getClient().ping();
          return {
            redis: {
              status: pong === 'PONG' ? 'up' : 'down',
            },
          };
        } catch (err: any) {
          return {
            redis: {
              status: 'down',
              message: err.message,
            },
          };
        }
      },

      // 3. Puppeteer Chromium Warm Page Pool
      async () => {
        const isReady = this.puppeteerPool.isHealthy();
        return {
          puppeteer_chromium_pool: {
            status: isReady ? 'up' : 'down',
          },
        };
      },
    ]);
  }

  /**
   * Prometheus Metrics Exposition Endpoint
   * Exposed at both /metrics and /api/v1/metrics.
   */
  @Get(['metrics', 'api/v1/metrics'])
  async getMetrics(@Res() reply: FastifyReply) {
    const metrics = await this.metricsService.getMetrics();
    reply
      .header('Content-Type', this.metricsService.getContentType())
      .send(metrics);
  }
}

