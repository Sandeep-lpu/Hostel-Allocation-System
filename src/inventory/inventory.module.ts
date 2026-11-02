import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { RoomCategory, RoomCategorySchema } from './schemas/room-category.schema';
import { HostelBlock, HostelBlockSchema } from './schemas/hostel-block.schema';
import { BedInventory, BedInventorySchema } from './schemas/bed-inventory.schema';
import { AncillaryService, AncillaryServiceSchema } from './schemas/ancillary-service.schema';
import { InventoryCacheService } from './services/inventory-cache.service';
import { InventoryService } from './services/inventory.service';
import { InventorySeederService } from './services/inventory-seeder.service';
import { InventoryController } from './inventory.controller';
import { WaitingRoomModule } from '../waiting-room/waiting-room.module';

/**
 * Inventory Module
 *
 * Implements Phase 2:
 * - Normalized Mongoose schemas for non-blocking bed concurrency
 * - Sub-millisecond Redis inventory caching & HINCRBY delta mutators
 * - Server-Sent Events availability delta streaming
 * - Automated 30s cache reconciliation cron job
 * - University dataset seeder (BH-01, Studio/Standard AC, 500 beds)
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RoomCategory.name, schema: RoomCategorySchema },
      { name: HostelBlock.name, schema: HostelBlockSchema },
      { name: BedInventory.name, schema: BedInventorySchema },
      { name: AncillaryService.name, schema: AncillaryServiceSchema },
    ]),
    ScheduleModule,
    WaitingRoomModule,
  ],
  controllers: [InventoryController],
  providers: [
    InventoryCacheService,
    InventoryService,
    InventorySeederService,
  ],
  exports: [
    InventoryService,
    InventoryCacheService,
    InventorySeederService,
    MongooseModule,
  ],
})
export class InventoryModule {}
