import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HostelBlock, HostelBlockDocument } from '../schemas/hostel-block.schema';
import { RoomCategory, RoomCategoryDocument } from '../schemas/room-category.schema';
import { BedInventory, BedInventoryDocument } from '../schemas/bed-inventory.schema';
import { AncillaryService, AncillaryServiceDocument } from '../schemas/ancillary-service.schema';
import { InventoryCacheService } from './inventory-cache.service';
import { Gender } from '../enums/gender.enum';
import { ServiceType } from '../enums/service-type.enum';
import { BedStatus } from '../enums/bed-status.enum';
import { INVENTORY_CONSTANTS } from '../constants/inventory.constants';

/**
 * Realistic Database Seeder for Phase 2
 * Populates Boys Hostel-01 (BH-01), Studio AC, Standard AC, Standard Air Cooled,
 * Mess/Laundry/Gym packages, and exactly 500 sample bed units including room A619 (Bed C).
 */
@Injectable()
export class InventorySeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(InventorySeederService.name);

  constructor(
    @InjectModel(HostelBlock.name)
    private readonly blockModel: Model<HostelBlockDocument>,
    @InjectModel(RoomCategory.name)
    private readonly categoryModel: Model<RoomCategoryDocument>,
    @InjectModel(BedInventory.name)
    private readonly bedModel: Model<BedInventoryDocument>,
    @InjectModel(AncillaryService.name)
    private readonly ancillaryModel: Model<AncillaryServiceDocument>,
    private readonly cacheService: InventoryCacheService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const existingBeds = await this.bedModel.countDocuments();
    if (existingBeds === 0) {
      this.logger.log('Inventory collection is empty. Bootstrapping realistic university dataset...');
      await this.seedAll();
    } else {
      this.logger.log(`Found ${existingBeds} existing beds in database. Running cache warm-up...`);
      await this.cacheService.warmUpInventoryCache();
    }
  }

  async seedAll(
    tenantId: string = INVENTORY_CONSTANTS.DEFAULTS.TENANT_ID,
    academicSession: string = INVENTORY_CONSTANTS.DEFAULTS.SESSION_ID,
  ): Promise<{
    block: string;
    categoriesCount: number;
    ancillaryCount: number;
    bedsCount: number;
  }> {
    this.logger.log(`Seeding Phase 2 catalog for [Tenant: ${tenantId}, Session: ${academicSession}]...`);

    // 1. Seed Hostel Block: Boys Hostel-01 (BH-01)
    await this.blockModel.updateOne(
      { tenantId, blockCode: 'BH-01' },
      {
        $set: {
          tenantId,
          blockCode: 'BH-01',
          blockName: 'Boys Hostel-01',
          gender: Gender.MALE,
          defaultMessName: 'Same Hostel Mess 1 (BH-01)',
        },
      },
      { upsert: true },
    );

    // 2. Seed Room Categories matching university pricing structure
    const categoriesToSeed = [
      // Studio Apartment Air Conditioned
      {
        tenantId,
        academicSession,
        categoryCode: 'STUDIO_AC_2S_PANTRY',
        roomType: 'Studio Apartment Air Conditioned',
        washroomType: 'Attached Washroom',
        seaterCount: 2,
        hasPantry: true,
        annualFee: 150000,
        lowSeatThreshold: 15,
      },
      {
        tenantId,
        academicSession,
        categoryCode: 'STUDIO_AC_3S_PANTRY',
        roomType: 'Studio Apartment Air Conditioned',
        washroomType: 'Attached Washroom',
        seaterCount: 3,
        hasPantry: true,
        annualFee: 130000,
        lowSeatThreshold: 20,
      },
      {
        tenantId,
        academicSession,
        categoryCode: 'STUDIO_AC_4S_PANTRY',
        roomType: 'Studio Apartment Air Conditioned',
        washroomType: 'Attached Washroom',
        seaterCount: 4,
        hasPantry: true,
        annualFee: 110000,
        lowSeatThreshold: 20,
      },
      // Standard Air Conditioned
      {
        tenantId,
        academicSession,
        categoryCode: 'STD_AC_2S',
        roomType: 'Standard Air Conditioned',
        washroomType: 'Attached Washroom',
        seaterCount: 2,
        hasPantry: false,
        annualFee: 143000,
        lowSeatThreshold: 25,
      },
      {
        tenantId,
        academicSession,
        categoryCode: 'STD_AC_3S',
        roomType: 'Standard Air Conditioned',
        washroomType: 'Attached Washroom',
        seaterCount: 3,
        hasPantry: false,
        annualFee: 123000,
        lowSeatThreshold: 30,
      },
      {
        tenantId,
        academicSession,
        categoryCode: 'STD_AC_4S',
        roomType: 'Standard Air Conditioned',
        washroomType: 'Attached Washroom',
        seaterCount: 4,
        hasPantry: false,
        annualFee: 103000,
        lowSeatThreshold: 25,
      },
      // Standard Air Cooled
      {
        tenantId,
        academicSession,
        categoryCode: 'STD_COOL_2S',
        roomType: 'Standard Air Cooled',
        washroomType: 'Attached Washroom',
        seaterCount: 2,
        hasPantry: false,
        annualFee: 123000,
        lowSeatThreshold: 20,
      },
      {
        tenantId,
        academicSession,
        categoryCode: 'STD_COOL_3S',
        roomType: 'Standard Air Cooled',
        washroomType: 'Attached Washroom',
        seaterCount: 3,
        hasPantry: false,
        annualFee: 108000,
        lowSeatThreshold: 20,
      },
    ];

    for (const cat of categoriesToSeed) {
      await this.categoryModel.updateOne(
        { tenantId, academicSession, categoryCode: cat.categoryCode },
        { $set: cat },
        { upsert: true },
      );
    }

    // 3. Seed Ancillary Services (Mess, Laundry, Gym)
    const ancillaryServices = [
      {
        tenantId,
        serviceCode: 'MESS_STD_NORTH_3M',
        serviceType: ServiceType.MESS,
        title: 'Standard Mess Three Meals - North Indian Exclusive',
        fee: 45000,
        isMandatory: true,
      },
      {
        tenantId,
        serviceCode: 'MESS_SPECIAL_SOUTH',
        serviceType: ServiceType.MESS,
        title: 'Special South Indian Three Meals',
        fee: 48000,
        isMandatory: false,
      },
      {
        tenantId,
        serviceCode: 'LAUNDRY_ANNUAL',
        serviceType: ServiceType.LAUNDRY,
        title: 'Annual Laundry Package (40 Washes / 400 Clothes)',
        fee: 5400,
        isMandatory: false,
      },
      {
        tenantId,
        serviceCode: 'GYM_ANNUAL',
        serviceType: ServiceType.GYM,
        title: 'Campus Central Gym & Fitness Center Annual Pass',
        fee: 5000,
        isMandatory: false,
      },
    ];

    for (const anc of ancillaryServices) {
      await this.ancillaryModel.updateOne(
        { tenantId, serviceCode: anc.serviceCode },
        { $set: anc },
        { upsert: true },
      );
    }

    // 4. Seed Exactly 500 Sample Beds (Floor 1-7, including A619 - Bed C)
    const bedsBatch: any[] = [];
    let bedCount = 0;
    const targetBeds = 500;

    // A. Explicitly guarantee A619 (Studio AC 3-Seater with Pantry on Floor 6)
    const roomA619Beds = ['Bed A', 'Bed B', 'Bed C'];
    for (const bedLabel of roomA619Beds) {
      bedsBatch.push({
        tenantId,
        academicSession,
        blockCode: 'BH-01',
        floor: 6,
        roomNumber: 'A619',
        bedLabel,
        categoryCode: 'STUDIO_AC_3S_PANTRY',
        status: BedStatus.AVAILABLE,
        allocatedTo: null,
        lockExpiresAt: null,
        version: 0,
      });
      bedCount++;
    }

    // B. Generate remaining beds across floors 1 to 7
    const categoryCodes = categoriesToSeed.map((c) => c.categoryCode);
    let floor = 1;
    let roomSeq = 101;

    while (bedCount < targetBeds) {
      const currentCategory = categoryCodes[roomSeq % categoryCodes.length];
      const catMeta = categoriesToSeed.find((c) => c.categoryCode === currentCategory)!;
      const seater = catMeta.seaterCount;
      const roomNum = `R-${floor}${String(roomSeq % 30).padStart(2, '0')}`;

      // Labels: Bed A, Bed B, Bed C, Bed D
      const labels = ['Bed A', 'Bed B', 'Bed C', 'Bed D'].slice(0, seater);

      for (const label of labels) {
        if (bedCount >= targetBeds) break;
        bedsBatch.push({
          tenantId,
          academicSession,
          blockCode: 'BH-01',
          floor,
          roomNumber: roomNum,
          bedLabel: label,
          categoryCode: currentCategory,
          status: BedStatus.AVAILABLE,
          allocatedTo: null,
          lockExpiresAt: null,
          version: 0,
        });
        bedCount++;
      }

      roomSeq++;
      if (roomSeq % 25 === 0) {
        floor = (floor % 7) + 1;
      }
    }

    // Clear and bulk insert beds
    await this.bedModel.deleteMany({ tenantId, academicSession, blockCode: 'BH-01' });
    await this.bedModel.insertMany(bedsBatch);

    this.logger.log(`Inserted ${bedsBatch.length} atomic bed units for BH-01.`);

    // 5. Synchronize and warm Redis cache
    await this.cacheService.warmUpInventoryCache(tenantId, academicSession);

    return {
      block: 'BH-01',
      categoriesCount: categoriesToSeed.length,
      ancillaryCount: ancillaryServices.length,
      bedsCount: bedsBatch.length,
    };
  }
}
