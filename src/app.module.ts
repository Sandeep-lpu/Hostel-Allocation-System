import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { AllocationModule } from './allocation/allocation.module';
import { DocumentsModule } from './documents/documents.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { StorageModule } from './storage/storage.module';
import { WaitingRoomModule } from './waiting-room/waiting-room.module';
import { InventoryModule } from './inventory/inventory.module';
import { StudentModule } from './student/student.module';
import { BookingModule } from './booking/booking.module';
import { GroupBookingModule } from './group-booking/group-booking.module';
import { OutboundWebhooksModule } from './outbound-webhooks/outbound-webhooks.module';
import { ObservabilityModule } from './observability/observability.module';
import { AuthModule } from './auth/auth.module';
import { ApplicationModule } from './application/application.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    // -------------------------------------------------------------------------
    // 1. Global Application Configuration
    // -------------------------------------------------------------------------
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),

    // -------------------------------------------------------------------------
    // 2. MongoDB Replica Set Connection (Optimized for High Concurrency)
    // -------------------------------------------------------------------------
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>(
          'MONGODB_URI',
          'mongodb://localhost:27017/hostel_allocation?replicaSet=rs0&directConnection=true',
        );
        const minPoolSize = configService.get<number>('MONGO_MIN_POOL_SIZE', 10);
        const maxPoolSize = configService.get<number>('MONGO_MAX_POOL_SIZE', 100);
        const serverSelectionTimeoutMS = configService.get<number>(
          'MONGO_SERVER_SELECTION_TIMEOUT_MS',
          5000,
        );
        const socketTimeoutMS = configService.get<number>(
          'MONGO_SOCKET_TIMEOUT_MS',
          45000,
        );

        Logger.log(
          `Configuring MongoDB Connection Pool: min=${minPoolSize}, max=${maxPoolSize}`,
          'AppModule',
        );

        return {
          uri,
          minPoolSize: Number(minPoolSize),
          maxPoolSize: Number(maxPoolSize),
          serverSelectionTimeoutMS: Number(serverSelectionTimeoutMS),
          socketTimeoutMS: Number(socketTimeoutMS),
          autoIndex: configService.get<string>('NODE_ENV') !== 'production',
          retryAttempts: 5,
          retryDelay: 2000,
          connectionFactory: (connection) => {
            connection.on('connected', () => {
              Logger.log(
                'MongoDB Replica Set rs0 connected successfully (Ready for ACID Transactions)',
                'MongooseModule',
              );
            });
            connection.on('error', (err: any) => {
              Logger.error(`MongoDB connection error: ${err.message}`, 'MongooseModule');
            });
            connection.on('disconnected', () => {
              Logger.warn('MongoDB disconnected from replica set', 'MongooseModule');
            });
            return connection;
          },
        };
      },
    }),

    // -------------------------------------------------------------------------
    // 3. Redis & BullMQ Asynchronous Processing Pipeline
    // -------------------------------------------------------------------------
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST', 'localhost');
        const port = configService.get<number>('REDIS_PORT', 6379);
        const password = configService.get<string>('REDIS_PASSWORD', '');
        const db = configService.get<number>('REDIS_DB', 0);

        Logger.log(`Configuring BullMQ Redis Client: ${host}:${port}`, 'AppModule');

        return {
          connection: {
            host,
            port: Number(port),
            password: password ? password : undefined,
            db: Number(db),
            // BullMQ requires maxRetriesPerRequest to be null for blocking queue operations
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            retryStrategy: (times: number) => {
              const delay = Math.min(times * 100, 3000);
              return delay;
            },
          },
        };
      },
    }),

    // -------------------------------------------------------------------------
    // 4. Domain Feature Modules
    // -------------------------------------------------------------------------
    AllocationModule,
    DocumentsModule,
    WebhooksModule,
    StorageModule,
    WaitingRoomModule,
    InventoryModule,
    StudentModule,
    BookingModule,
    GroupBookingModule,
    OutboundWebhooksModule,
    ObservabilityModule,
    AuthModule,
    ApplicationModule,
    ReportsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
