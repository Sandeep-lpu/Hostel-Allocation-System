import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { ResidentialCart, ResidentialCartSchema } from '../booking/schemas/residential-cart.schema';
import { BedInventory, BedInventorySchema } from '../inventory/schemas/bed-inventory.schema';
import { RoomCategory, RoomCategorySchema } from '../inventory/schemas/room-category.schema';
import { HostelBlock, HostelBlockSchema } from '../inventory/schemas/hostel-block.schema';
import { StudentProfile, StudentProfileSchema } from '../student/schemas/student-profile.schema';
import { AncillaryService, AncillaryServiceSchema } from '../inventory/schemas/ancillary-service.schema';
import { PuppeteerPoolService } from './services/puppeteer-pool.service';
import { PdfGenerationProcessor, PDF_QUEUE_NAME } from './processors/pdf-generation.processor';
import { DocumentsController } from './documents.controller';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ResidentialCart.name, schema: ResidentialCartSchema },
      { name: BedInventory.name, schema: BedInventorySchema },
      { name: RoomCategory.name, schema: RoomCategorySchema },
      { name: HostelBlock.name, schema: HostelBlockSchema },
      { name: StudentProfile.name, schema: StudentProfileSchema },
      { name: AncillaryService.name, schema: AncillaryServiceSchema },
    ]),
    BullModule.registerQueue({
      name: PDF_QUEUE_NAME,
    }),
    StorageModule,
  ],
  controllers: [DocumentsController],
  providers: [PuppeteerPoolService, PdfGenerationProcessor],
  exports: [PuppeteerPoolService],
})
export class DocumentsModule {}
