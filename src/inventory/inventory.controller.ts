import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  MessageEvent,
  Param,
  Patch,
  Post,
  Query,
  Body,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, throttleTime } from 'rxjs/operators';
import { InventoryService } from './services/inventory.service';
import { InventoryCacheService } from './services/inventory-cache.service';
import { InventorySeederService } from './services/inventory-seeder.service';
import { CatalogQueryDto } from './dto/catalog-query.dto';
import { RoomQueryDto } from './dto/room-query.dto';
import { InventoryCatalogResponse } from './interfaces/inventory-catalog.interface';
import { AdmissionPassGuard } from '../waiting-room/guards/admission-pass.guard';
import { INVENTORY_CONSTANTS } from './constants/inventory.constants';
import { BedStatus } from './enums/bed-status.enum';

/**
 * Inventory Controller
 *
 * Exposes live catalog, specific room/bed layout queries, and throttled Server-Sent Events (SSE) stream.
 * Protected by AdmissionPassGuard (requires active student admission pass from Phase 1).
 */
@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly inventoryCacheService: InventoryCacheService,
    private readonly seederService: InventorySeederService,
  ) {}

  /**
   * Overall Inventory Statistics (Admin Overview Dashboard)
   */
  @Get('overview')
  async getOverview(
    @Query('tenantId') tenantId?: string,
    @Query('sessionId') sessionId?: string,
  ) {
    return this.inventoryService.getInventoryOverview(tenantId, sessionId);
  }

  /**
   * List all hostel blocks (e.g. Boys BH-01, Girls GH-01)
   */
  @Get('blocks')
  async getBlocks(@Query('tenantId') tenantId?: string) {
    return this.inventoryService.getAllBlocks(tenantId);
  }

  /**
   * Floor-wise Bed Map Matrix for Admin Portal & Interactive Room Navigator
   */
  @Get('floor-map/:blockCode/:floor')
  async getFloorBedMap(
    @Param('blockCode') blockCode: string,
    @Param('floor') floor: string,
    @Query('tenantId') tenantId?: string,
    @Query('sessionId') sessionId?: string,
  ) {
    return this.inventoryService.getFloorBedMap(
      tenantId,
      sessionId,
      blockCode,
      parseInt(floor, 10),
    );
  }

  /**
   * Admin Bed Status Toggle (AVAILABLE <-> MAINTENANCE)
   */
  @Patch('bed/:bedId/status')
  async updateBedStatus(
    @Param('bedId') bedId: string,
    @Body() body: { status: BedStatus; reason?: string },
  ) {
    return this.inventoryService.updateBedStatus(bedId, body.status, body.reason);
  }

  /**
   * Public Catalog for prospective student exploration without waiting room gate
   */
  @Get('public-catalog')
  async getPublicCatalog(@Query() query: CatalogQueryDto) {
    return this.inventoryService.getLiveCatalog(query);
  }

  /**
   * Serve full room types, seater categories, prices, mess options, and live seat status from RAM in <5ms.
   * Protected with Phase 1 AdmissionPassGuard.
   */
  @Get('catalog')
  @UseGuards(AdmissionPassGuard)
  async getCatalog(
    @Query() query: CatalogQueryDto,
  ): Promise<InventoryCatalogResponse> {
    return this.inventoryService.getLiveCatalog(query);
  }

  /**
   * Detailed room and specific bed inspection (Bed A, Bed B, Bed C, Bed D)
   * Protected with Phase 1 AdmissionPassGuard.
   */
  @Get('rooms/:blockCode/:categoryCode')
  @UseGuards(AdmissionPassGuard)
  async getRooms(
    @Param('blockCode') blockCode: string,
    @Param('categoryCode') categoryCode: string,
    @Query() query: RoomQueryDto,
  ) {
    const tenantId = query.tenantId || INVENTORY_CONSTANTS.DEFAULTS.TENANT_ID;
    const sessionId = query.sessionId || INVENTORY_CONSTANTS.DEFAULTS.SESSION_ID;

    return this.inventoryService.getRoomsByBlockAndCategory(
      tenantId,
      sessionId,
      blockCode,
      categoryCode,
    );
  }

  /**
   * Real-Time Inventory Delta Stream
   * Streams throttled (max 1 update/sec) updates to connected students via Redis Pub/Sub.
   */
  @Sse('stream-availability')
  streamAvailability(): Observable<MessageEvent> {
    return this.inventoryCacheService.getInventoryStream().pipe(
      throttleTime(INVENTORY_CONSTANTS.DEFAULTS.SSE_THROTTLE_MS, undefined, {
        leading: true,
        trailing: true,
      }),
      map(
        (event) =>
          ({
            data: event,
            type: 'inventory_delta',
          }) as MessageEvent,
      ),
    );
  }

  /**
   * Administrative Seeder Endpoint
   */
  @Post('seed')
  @HttpCode(HttpStatus.OK)
  async seedInventory(
    @Query('tenantId') tenantId?: string,
    @Query('sessionId') sessionId?: string,
  ) {
    const result = await this.seederService.seedAll(tenantId, sessionId);
    return {
      success: true,
      message: 'Phase 2 catalog & 500 bed units seeded successfully',
      result,
    };
  }

  /**
   * Administrative Cache Warm-Up Endpoint
   */
  @Post('warm-up')
  @HttpCode(HttpStatus.OK)
  async warmUpCache(
    @Query('tenantId') tenantId?: string,
    @Query('sessionId') sessionId?: string,
  ) {
    const result = await this.inventoryService.triggerWarmUp(
      tenantId || INVENTORY_CONSTANTS.DEFAULTS.TENANT_ID,
      sessionId || INVENTORY_CONSTANTS.DEFAULTS.SESSION_ID,
    );
    return {
      success: true,
      message: 'Inventory cache warmed into Redis RAM',
      result,
    };
  }
}
