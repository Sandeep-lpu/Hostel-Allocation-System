import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { VwrRedisService } from '../redis/redis.service';
import { VWR_CONSTANTS } from '../constants/waiting-room.constants';
import { SLIDING_WINDOW_RATE_LIMIT_LUA } from '../lua/waiting-room.lua';

/**
 * High-Throughput Redis Sliding-Window Rate Limiter
 *
 * Distributed Systems Rationale:
 * On university campuses, 10,000+ students connect via shared NAT/proxy IP addresses (eduroam / campus Wi-Fi).
 * Traditional IP-based rate limiting immediately causes widespread false-positives and blocks legitimate students.
 * This guard enforces a sliding-window rate limit keyed on student identity (`studentId`),
 * backed by an atomic Redis Lua script for O(1) performance under massive concurrency.
 */
@Injectable()
export class StudentRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(StudentRateLimitGuard.name);

  constructor(private readonly redisService: VwrRedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    // Extract studentId and tenantId across body, query, params, user context, or headers
    const studentId: string =
      req.body?.studentId ||
      req.query?.studentId ||
      req.params?.studentId ||
      req.user?.studentId ||
      req.headers?.['x-student-id'] ||
      req.ip ||
      'anonymous';

    const tenantId: string =
      req.body?.tenantId ||
      req.query?.tenantId ||
      req.params?.tenantId ||
      req.user?.tenantId ||
      req.headers?.['x-tenant-id'] ||
      'default';

    const windowMs = VWR_CONSTANTS.RATE_LIMIT.WINDOW_MS;
    const maxRequests = VWR_CONSTANTS.RATE_LIMIT.MAX_REQUESTS;
    const nowMs = Date.now();
    const uniqueReqId = crypto.randomUUID();

    const rateLimitKey = VWR_CONSTANTS.KEYS.RATE_LIMIT_STUDENT(tenantId, studentId);

    try {
      // Execute atomic sliding window script: [allowed, currentCount, remaining]
      const result = await this.redisService.evalScript<[number, number, number]>(
        SLIDING_WINDOW_RATE_LIMIT_LUA,
        [rateLimitKey],
        [windowMs, maxRequests, nowMs, uniqueReqId],
      );

      const [allowed, currentCount, remaining] = result;

      // Set standard RFC rate limit response headers (Fastify or Express compatible)
      const setHeader = (name: string, value: string | number) => {
        if (res.header) {
          res.header(name, String(value));
        } else if (res.setHeader) {
          res.setHeader(name, String(value));
        }
      };

      setHeader('X-RateLimit-Limit', maxRequests);
      setHeader('X-RateLimit-Remaining', Math.max(0, remaining));
      setHeader('X-RateLimit-Reset', Math.ceil((nowMs + windowMs) / 1000));

      if (allowed === 0) {
        setHeader('Retry-After', Math.ceil(windowMs / 1000));
        this.logger.warn(
          `Rate limit exceeded for student: ${studentId} in tenant: ${tenantId} (${currentCount}/${maxRequests} reqs)`,
        );
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            error: 'Too Many Requests',
            message: 'Queue access rate limit exceeded. Please wait a moment before retrying.',
            studentId,
            retryAfterSeconds: Math.ceil(windowMs / 1000),
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return true;
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      this.logger.error(`Redis rate limit evaluation error: ${err.message}`, err.stack);
      // Fail-open strategy to prevent Redis glitches from bricking system availability
      return true;
    }
  }
}
