import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: false,
      trustProxy: true,
      bodyLimit: 10 * 1024 * 1024, // 10MB
    }),
    {
      bufferLogs: true,
    },
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const globalPrefix = configService.get<string>('GLOBAL_PREFIX', 'api/v1');
  const corsOrigins = configService.get<string>(
    'CORS_ORIGIN',
    'http://localhost:3000,http://localhost:5173',
  );

  // ---------------------------------------------------------------------------
  // 1. Global API Prefix (Root /health and /metrics excluded for Prometheus/K8s)
  // ---------------------------------------------------------------------------
  app.setGlobalPrefix(globalPrefix, {
    exclude: ['health', 'metrics', 'api/v1/health', 'api/v1/metrics'],
  });

  // ---------------------------------------------------------------------------
  // 2. Global Validation Pipe with strict payload enforcement
  // ---------------------------------------------------------------------------
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ---------------------------------------------------------------------------
  // 3. Robust CORS Configuration
  // ---------------------------------------------------------------------------
  const allowedOrigins = corsOrigins.split(',').map((origin) => origin.trim());
  app.enableCors({
    origin: allowedOrigins.length === 1 && allowedOrigins[0] === '*' ? true : allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Webhook-Signature',
      'X-Admission-Pass',
      'X-Student-Id',
      'X-Tenant-Id',
      'X-Session-Id',
      'X-Idempotency-Key',
      'x-idempotency-key',
    ],
  });

  // ---------------------------------------------------------------------------
  // 4. Lifecycle & Graceful Shutdown
  // ---------------------------------------------------------------------------
  app.enableShutdownHooks();

  // ---------------------------------------------------------------------------
  // 5. Start HTTP Listener (Fastify requires '0.0.0.0' for external binding)
  // ---------------------------------------------------------------------------
  await app.listen(port, '0.0.0.0');
  logger.log(`=============================================================`);
  logger.log(` Hostel Allocation Engine running on: http://localhost:${port}/${globalPrefix}`);
  logger.log(` High-Throughput HTTP Engine: Fastify`);
  logger.log(` Environment Mode: ${configService.get<string>('NODE_ENV', 'development')}`);
  logger.log(` CORS Allowed Origins: ${allowedOrigins.join(', ')}`);
  logger.log(`=============================================================`);
}

bootstrap().catch((error) => {
  new Logger('BootstrapError').error(`Application failed to start: ${error.message}`, error.stack);
  process.exit(1);
});

