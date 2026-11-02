import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { ResidentialCart, ResidentialCartSchema } from './schemas/residential-cart.schema';
import { BedInventory, BedInventorySchema } from '../inventory/schemas/bed-inventory.schema';
import { RoomCategory, RoomCategorySchema } from '../inventory/schemas/room-category.schema';
import { StudentProfile, StudentProfileSchema } from '../student/schemas/student-profile.schema';
import { BookingLockService } from './services/booking-lock.service';
import { BookingService } from './services/booking.service';
import { CartExpiryProcessor } from './processors/cart-expiry.processor';
import { BookingController } from './booking.controller';
import { WaitingRoomModule } from '../waiting-room/waiting-room.module';
import { InventoryModule } from '../inventory/inventory.module';
import { StudentModule } from '../student/student.module';
import { BOOKING_CONSTANTS } from './constants/booking.constants';
import { PDF_QUEUE_NAME } from '../documents/processors/pdf-generation.processor';

/**
 * Booking Engine Module
 *
 * Implements Phase 3:
 * - High-concurrency atomic residential cart holds
 * - Distributed Redis Lua pre-flight gatekeeper
 * - Multi-document ACID transactions with snapshot isolation
 * - Delayed BullMQ self-healing cart expiry worker (10 minutes)
 * - Fallback cron orphaned lock sweeper
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ResidentialCart.name, schema: ResidentialCartSchema },
      { name: BedInventory.name, schema: BedInventorySchema },
      { name: RoomCategory.name, schema: RoomCategorySchema },
      { name: StudentProfile.name, schema: StudentProfileSchema },
    ]),
    BullModule.registerQueue({
      name: BOOKING_CONSTANTS.QUEUES.CART_EXPIRY,
    }),
    BullModule.registerQueue({
      name: PDF_QUEUE_NAME,
    }),
    WaitingRoomModule,
    InventoryModule,
    StudentModule,
  ],
  controllers: [BookingController],
  providers: [
    BookingLockService,
    BookingService,
    CartExpiryProcessor,
  ],
  exports: [
    BookingService,
    BookingLockService,
  ],
})
export class BookingModule {}

