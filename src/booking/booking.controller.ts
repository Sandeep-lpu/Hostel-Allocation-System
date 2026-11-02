import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BookingService } from './services/booking.service';
import { CreateHoldDto } from './dto/create-hold.dto';
import { FoodServiceChangeDto } from './dto/food-service-change.dto';
import { CartResponseDto } from './dto/cart-response.dto';
import { AdmissionPassGuard } from '../waiting-room/guards/admission-pass.guard';

/**
 * Booking Engine HTTP Controller
 *
 * All endpoints are strictly gated by Phase 1's AdmissionPassGuard.
 * Requires valid cryptographic Admission_JWT pass.
 */
@Controller('booking')
@UseGuards(AdmissionPassGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  /**
   * Acquire a 10-Minute Residential Cart Bed Hold
   * Protected with strict idempotency and undertaking enforcement.
   */
  @Post('hold')
  @HttpCode(HttpStatus.CREATED)
  async createHold(
    @Req() req: any,
    @Body() dto: CreateHoldDto,
    @Headers('x-idempotency-key') idempotencyKeyHeader?: string,
  ): Promise<CartResponseDto> {
    const idempotencyKey =
      idempotencyKeyHeader || req.headers?.['x-idempotency-key'] || req.body?.idempotencyKey;

    if (!idempotencyKey) {
      throw new BadRequestException(
        'Missing required header: X-Idempotency-Key. A unique UUID or client token is required.',
      );
    }

    const studentId: string =
      req.admissionPass?.studentId || req.user?.studentId || req.headers?.['x-student-id'];

    if (!studentId) {
      throw new BadRequestException('Student identity could not be verified from admission pass.');
    }

    return this.bookingService.createCartHold(studentId, dto, idempotencyKey);
  }

  /**
   * Voluntarily cancel an active cart hold to select a different room or category
   */
  @Delete('hold/:cartId')
  @Post('hold/:cartId/release')
  @HttpCode(HttpStatus.OK)
  async releaseHold(
    @Req() req: any,
    @Param('cartId') cartId: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!cartId || cartId === 'undefined' || cartId === 'null') {
      throw new BadRequestException('A valid cartId parameter is required to release a hold.');
    }

    const studentId: string =
      req.admissionPass?.studentId || req.user?.studentId || req.headers?.['x-student-id'];
    const tenantId: string =
      req.admissionPass?.tenantId || req.user?.tenantId || 'univ-delhi-hostel';

    return this.bookingService.releaseCartHold(cartId, studentId, tenantId);
  }

  /**
   * Request Food / Service Change (Mess, Laundry, Gym upgrades) without moving bed
   */
  @Post('food-or-service-change')
  @HttpCode(HttpStatus.CREATED)
  async createServiceChange(
    @Req() req: any,
    @Body() dto: FoodServiceChangeDto,
    @Headers('x-idempotency-key') idempotencyKeyHeader?: string,
  ): Promise<CartResponseDto> {
    const idempotencyKey =
      idempotencyKeyHeader || req.headers?.['x-idempotency-key'] || req.body?.idempotencyKey;

    if (!idempotencyKey) {
      throw new BadRequestException('Missing required header: X-Idempotency-Key.');
    }

    const studentId: string =
      req.admissionPass?.studentId || req.user?.studentId || req.headers?.['x-student-id'];

    return this.bookingService.createFoodOrServiceChange(studentId, dto, idempotencyKey);
  }

  /**
   * Get Current Cart Details and countdown timer
   */
  @Get('cart/:cartId')
  async getCart(
    @Req() req: any,
    @Param('cartId') cartId: string,
  ): Promise<CartResponseDto> {
    const studentId: string =
      req.admissionPass?.studentId || req.user?.studentId || req.headers?.['x-student-id'];
    const tenantId: string =
      req.admissionPass?.tenantId || req.user?.tenantId || 'univ-delhi-hostel';

    return this.bookingService.getCartById(cartId, studentId, tenantId);
  }

  /**
   * Confirm and settle payment for residential cart
   */
  @Post('cart/:cartId/confirm-payment')
  @HttpCode(HttpStatus.OK)
  async confirmPayment(
    @Req() req: any,
    @Param('cartId') cartId: string,
    @Body() body?: { transactionRef?: string },
  ): Promise<CartResponseDto> {
    const studentId: string =
      req.admissionPass?.studentId || req.user?.studentId || req.headers?.['x-student-id'];
    const tenantId: string =
      req.admissionPass?.tenantId || req.user?.tenantId || 'univ-delhi-hostel';

    return this.bookingService.confirmAndSettlePayment(
      cartId,
      studentId,
      tenantId,
      body?.transactionRef,
    );
  }
}
