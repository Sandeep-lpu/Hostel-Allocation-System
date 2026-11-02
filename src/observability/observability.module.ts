import { Module, Global } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { MetricsService } from './services/metrics.service';
import { ObservabilityController } from './observability.controller';
import { WaitingRoomModule } from '../waiting-room/waiting-room.module';
import { DocumentsModule } from '../documents/documents.module';

@Global()
@Module({
  imports: [TerminusModule, WaitingRoomModule, DocumentsModule],
  controllers: [ObservabilityController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class ObservabilityModule {}

