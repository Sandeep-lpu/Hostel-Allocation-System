import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { RoommateGroup, RoommateGroupSchema } from './schemas/roommate-group.schema';
import { BedInventory, BedInventorySchema } from '../inventory/schemas/bed-inventory.schema';
import { RoomCategory, RoomCategorySchema } from '../inventory/schemas/room-category.schema';
import { StudentProfile, StudentProfileSchema } from '../student/schemas/student-profile.schema';
import { ResidentialCart, ResidentialCartSchema } from '../booking/schemas/residential-cart.schema';
import { GroupLobbyService } from './services/group-lobby.service';
import { GroupAllocationService } from './services/group-allocation.service';
import { GroupBookingController } from './group-booking.controller';
import { WaitingRoomModule } from '../waiting-room/waiting-room.module';
import { InventoryModule } from '../inventory/inventory.module';
import { StudentModule } from '../student/student.module';
import { BookingModule } from '../booking/booking.module';
import { BOOKING_CONSTANTS } from '../booking/constants/booking.constants';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RoommateGroup.name, schema: RoommateGroupSchema },
      { name: BedInventory.name, schema: BedInventorySchema },
      { name: RoomCategory.name, schema: RoomCategorySchema },
      { name: StudentProfile.name, schema: StudentProfileSchema },
      { name: ResidentialCart.name, schema: ResidentialCartSchema },
    ]),
    BullModule.registerQueue({
      name: BOOKING_CONSTANTS.QUEUES.CART_EXPIRY,
    }),
    WaitingRoomModule,
    InventoryModule,
    StudentModule,
    BookingModule,
  ],
  controllers: [GroupBookingController],
  providers: [GroupLobbyService, GroupAllocationService],
  exports: [GroupLobbyService, GroupAllocationService],
})
export class GroupBookingModule {}

