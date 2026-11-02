import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VwrRedisService } from './redis.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [VwrRedisService],
  exports: [VwrRedisService],
})
export class VwrRedisModule {}
