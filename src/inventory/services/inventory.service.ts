import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BedInventory, BedInventoryDocument } from '../schemas/bed-inventory.schema';
import { HostelBlock, HostelBlockDocument } from '../schemas/hostel-block.schema';
import { RoomCategory, RoomCategoryDocument } from '../schemas/room-category.schema';
import { InventoryCacheService } from './inventory-cache.service';
import { CatalogQueryDto } from '../dto/catalog-query.dto';
import {
  InventoryCatalogResponse,
  RoomDetailItem,
  BedDetailItem,
} from '../interfaces/inventory-catalog.interface';
import { BedStatus } from '../enums/bed-status.enum';
import { INVENTORY_CONSTANTS } from '../constants/inventory.constants';

/**
 * Inventory Domain Service
 * Handles room-level queries, bed availability grouping, and catalog retrieval.
 */
@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectModel(BedInventory.name)
    private readonly bedModel: Model<BedInventoryDocument>,
    @InjectModel(HostelBlock.name)
    private readonly blockModel: Model<HostelBlockDocument>,
    @InjectModel(RoomCategory.name)
    private readonly categoryModel: Model<RoomCategoryDocument>,
    private readonly cacheService: InventoryCacheService,
  ) {}

  /**
   * Fast catalog query served via RAM mirror (<5ms)
   */
  async getLiveCatalog(dto: CatalogQueryDto): Promise<InventoryCatalogResponse> {
    const tenant = dto.tenantId || INVENTORY_CONSTANTS.DEFAULTS.TENANT_ID;
    const session = dto.sessionId || dto.academicSession || INVENTORY_CONSTANTS.DEFAULTS.SESSION_ID;
    return this.cacheService.getLiveCatalogWithAvailability(
      tenant,
      session,
      dto.gender,
    );
  }

  /**
   * Return specific rooms and individual bed statuses (Bed A, Bed B, Bed C, etc.)
   * Used when a student selects a category and chooses a physical room or checks group capacity.
   */
  async getRoomsByBlockAndCategory(
    tenantId: string,
    academicSession: string,
    blockCode: string,
    categoryCode: string,
  ): Promise<{
    blockCode: string;
    categoryCode: string;
    totalRooms: number;
    rooms: RoomDetailItem[];
  }> {
    // 1. Validate block exists
    const block = await this.blockModel.findOne({ tenantId, blockCode }).lean();
    if (!block) {
      throw new NotFoundException(`Hostel block '${blockCode}' not found for tenant '${tenantId}'`);
    }

    // 2. Fetch all beds for this category in the specified block
    const beds = await this.bedModel
      .find({
        tenantId,
        academicSession,
        blockCode,
        categoryCode,
      })
      .sort({ floor: 1, roomNumber: 1, bedLabel: 1 })
      .lean();

    // 3. Group beds by room
    const roomMap = new Map<string, RoomDetailItem>();

    for (const bed of beds) {
      const roomKey = `${bed.blockCode}-${bed.roomNumber}`;
      if (!roomMap.has(roomKey)) {
        roomMap.set(roomKey, {
          blockCode: bed.blockCode,
          roomNumber: bed.roomNumber,
          floor: bed.floor,
          categoryCode: bed.categoryCode,
          totalBeds: 0,
          availableBeds: 0,
          beds: [],
        });
      }

      const room = roomMap.get(roomKey)!;
      room.totalBeds += 1;
      const isAvailable = bed.status === BedStatus.AVAILABLE;
      if (isAvailable) {
        room.availableBeds += 1;
      }

      const bedDetail: BedDetailItem = {
        bedLabel: bed.bedLabel,
        status: bed.status,
        isAvailable,
        lockExpiresAt: bed.lockExpiresAt,
      };
      room.beds.push(bedDetail);
    }

    const roomList = Array.from(roomMap.values());

    return {
      blockCode,
      categoryCode,
      totalRooms: roomList.length,
      rooms: roomList,
    };
  }

  /**
   * System-wide Inventory Overview Statistics
   */
  async getInventoryOverview(tenantId: string = INVENTORY_CONSTANTS.DEFAULTS.TENANT_ID, academicSession: string = INVENTORY_CONSTANTS.DEFAULTS.SESSION_ID) {
    const blocks = await this.blockModel.find({ tenantId }).lean();
    const categories = await this.categoryModel.find({ tenantId, academicSession }).lean();

    const [totalBeds, availableBeds, lockedBeds, bookedBeds, maintenanceBeds] = await Promise.all([
      this.bedModel.countDocuments({ tenantId, academicSession }),
      this.bedModel.countDocuments({ tenantId, academicSession, status: BedStatus.AVAILABLE }),
      this.bedModel.countDocuments({ tenantId, academicSession, status: BedStatus.LOCKED_IN_CART }),
      this.bedModel.countDocuments({ tenantId, academicSession, status: BedStatus.BOOKED }),
      this.bedModel.countDocuments({ tenantId, academicSession, status: BedStatus.MAINTENANCE }),
    ]);

    const occupiedBeds = lockedBeds + bookedBeds;
    const occupancyPercentage = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    // Per-block statistics
    const blockStats = await Promise.all(
      blocks.map(async (b) => {
        const [bTotal, bAvailable, bBooked, bLocked, bMaintenance] = await Promise.all([
          this.bedModel.countDocuments({ tenantId, academicSession, blockCode: b.blockCode }),
          this.bedModel.countDocuments({ tenantId, academicSession, blockCode: b.blockCode, status: BedStatus.AVAILABLE }),
          this.bedModel.countDocuments({ tenantId, academicSession, blockCode: b.blockCode, status: BedStatus.BOOKED }),
          this.bedModel.countDocuments({ tenantId, academicSession, blockCode: b.blockCode, status: BedStatus.LOCKED_IN_CART }),
          this.bedModel.countDocuments({ tenantId, academicSession, blockCode: b.blockCode, status: BedStatus.MAINTENANCE }),
        ]);

        const bOccupied = bBooked + bLocked;
        return {
          blockCode: b.blockCode,
          blockName: b.blockName,
          gender: b.gender,
          defaultMessName: b.defaultMessName,
          totalBeds: bTotal,
          availableBeds: bAvailable,
          occupiedBeds: bOccupied,
          maintenanceBeds: bMaintenance,
          occupancyPercentage: bTotal > 0 ? Math.round((bOccupied / bTotal) * 100) : 0,
        };
      }),
    );

    return {
      tenantId,
      academicSession,
      totalHostels: blocks.length,
      totalCapacity: totalBeds,
      availableBeds,
      occupiedBeds,
      lockedBeds,
      bookedBeds,
      maintenanceBeds,
      occupancyPercentage,
      blocks: blockStats,
      categoriesCount: categories.length,
    };
  }

  /**
   * Fetch all hostel blocks
   */
  async getAllBlocks(tenantId: string = INVENTORY_CONSTANTS.DEFAULTS.TENANT_ID) {
    return this.blockModel.find({ tenantId }).sort({ blockCode: 1 }).lean();
  }

  /**
   * Visual Floor-wise Bed Matrix
   * Returns all rooms on a specific floor with their individual bed cards and occupancy details.
   */
  async getFloorBedMap(
    tenantId: string = INVENTORY_CONSTANTS.DEFAULTS.TENANT_ID,
    academicSession: string = INVENTORY_CONSTANTS.DEFAULTS.SESSION_ID,
    blockCode: string,
    floor: number,
  ) {
    const block = await this.blockModel.findOne({ tenantId, blockCode }).lean();
    if (!block) {
      throw new NotFoundException(`Hostel block '${blockCode}' not found`);
    }

    // Get all beds on this floor
    const beds = await this.bedModel
      .find({
        tenantId,
        academicSession,
        blockCode,
        floor: Number(floor),
      })
      .sort({ roomNumber: 1, bedLabel: 1 })
      .lean();

    // Map categories for quick lookup
    const categories = await this.categoryModel.find({ tenantId, academicSession }).lean();
    const categoryMap = new Map(categories.map((c) => [c.categoryCode, c]));

    // Group into room objects
    const roomMap = new Map<string, any>();

    for (const bed of beds) {
      if (!roomMap.has(bed.roomNumber)) {
        const cat = categoryMap.get(bed.categoryCode);
        roomMap.set(bed.roomNumber, {
          roomNumber: bed.roomNumber,
          floor: bed.floor,
          blockCode: bed.blockCode,
          categoryCode: bed.categoryCode,
          roomType: cat?.roomType || 'Standard Room',
          seaterCount: cat?.seaterCount || 2,
          annualFee: cat?.annualFee || 0,
          washroomType: cat?.washroomType || 'Attached Washroom',
          hasPantry: cat?.hasPantry || false,
          totalBeds: 0,
          availableBeds: 0,
          occupiedBeds: 0,
          maintenanceBeds: 0,
          beds: [],
        });
      }

      const room = roomMap.get(bed.roomNumber);
      room.totalBeds += 1;
      if (bed.status === BedStatus.AVAILABLE) room.availableBeds += 1;
      else if (bed.status === BedStatus.MAINTENANCE) room.maintenanceBeds += 1;
      else room.occupiedBeds += 1;

      room.beds.push({
        _id: bed._id.toString(),
        bedLabel: bed.bedLabel,
        status: bed.status,
        allocatedTo: bed.allocatedTo,
        lockExpiresAt: bed.lockExpiresAt,
      });
    }

    const rooms = Array.from(roomMap.values());
    const floorTotalBeds = beds.length;
    const floorAvailable = beds.filter((b) => b.status === BedStatus.AVAILABLE).length;
    const floorOccupied = beds.filter((b) => b.status === BedStatus.BOOKED || b.status === BedStatus.LOCKED_IN_CART).length;
    const floorMaintenance = beds.filter((b) => b.status === BedStatus.MAINTENANCE).length;

    return {
      blockCode,
      blockName: block.blockName,
      gender: block.gender,
      floor: Number(floor),
      stats: {
        totalRooms: rooms.length,
        totalBeds: floorTotalBeds,
        availableBeds: floorAvailable,
        occupiedBeds: floorOccupied,
        maintenanceBeds: floorMaintenance,
        occupancyPercentage: floorTotalBeds > 0 ? Math.round((floorOccupied / floorTotalBeds) * 100) : 0,
      },
      rooms,
    };
  }

  /**
   * Update individual bed status (AVAILABLE vs MAINTENANCE) with audit
   */
  async updateBedStatus(bedId: string, status: BedStatus, reason?: string) {
    const bed = await this.bedModel.findById(bedId);
    if (!bed) {
      throw new NotFoundException(`Bed with ID '${bedId}' not found`);
    }

    const oldStatus = bed.status;
    bed.status = status;
    if (status === BedStatus.AVAILABLE) {
      bed.allocatedTo = null as any;
      bed.lockExpiresAt = null as any;
    }
    await bed.save();

    this.logger.log(`Bed ${bed.blockCode}-${bed.roomNumber} (${bed.bedLabel}) status updated: ${oldStatus} -> ${status}. Reason: ${reason || 'N/A'}`);
    return {
      success: true,
      bedId: bed._id,
      roomNumber: bed.roomNumber,
      bedLabel: bed.bedLabel,
      previousStatus: oldStatus,
      newStatus: bed.status,
      reason,
    };
  }

  /**
   * Administrative cache warming trigger
   */
  async triggerWarmUp(tenantId: string, academicSession: string) {
    return this.cacheService.warmUpInventoryCache(tenantId, academicSession);
  }
}
