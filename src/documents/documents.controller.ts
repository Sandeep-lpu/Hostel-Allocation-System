import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FastifyReply } from 'fastify';
import * as crypto from 'crypto';
import { ResidentialCart, ResidentialCartDocument } from '../booking/schemas/residential-cart.schema';
import { BedInventory, BedInventoryDocument } from '../inventory/schemas/bed-inventory.schema';
import { StudentProfile, StudentProfileDocument } from '../student/schemas/student-profile.schema';
import { StorageService } from '../storage/storage.service';
import { BedStatus } from '../inventory/enums/bed-status.enum';

export interface VerifyQrDto {
  data: {
    cartId: string;
    studentId: string;
    rollNumber: string;
    blockCode: string;
    roomNumber: string;
    bedLabel: string;
    categoryCode: string;
    academicSession: string;
    status: string;
    issuedAt: number;
  };
  sig: string;
}

@Controller('documents')
export class DocumentsController {
  private readonly secretKey: string =
    process.env.VWR_JWT_SECRET || 'vwr_super_secure_distributed_engine_secret_2026';

  constructor(
    @InjectModel(ResidentialCart.name)
    private readonly cartModel: Model<ResidentialCartDocument>,
    @InjectModel(BedInventory.name)
    private readonly bedModel: Model<BedInventoryDocument>,
    @InjectModel(StudentProfile.name)
    private readonly studentModel: Model<StudentProfileDocument>,
    private readonly storageService: StorageService,
  ) {}

  /**
   * 1. Query Document Status & Download Link
   */
  @Get('allotment-slip/:cartId')
  @HttpCode(HttpStatus.OK)
  async getDocumentStatus(@Param('cartId') cartId: string) {
    const cart = await this.cartModel.findById(cartId);
    if (!cart) {
      throw new NotFoundException(`Residential cart '${cartId}' not found.`);
    }

    const filename = `allotment-slip-${cart._id}.pdf`;
    const isReady = this.storageService.documentExists(filename);

    return {
      cartId: cart._id.toString(),
      studentId: cart.studentId,
      documentStatus: isReady ? 'READY' : cart.documentStatus || 'PENDING',
      downloadUrl: isReady ? `/api/v1/documents/allotment-slip/${cart._id}/download` : null,
      updatedAt: (cart as any).updatedAt,
    };
  }

  /**
   * 2. Stream / Download Rendered PDF Allotment Slip
   */
  @Get('allotment-slip/:cartId/download')
  async downloadAllotmentSlip(
    @Param('cartId') cartId: string,
    @Res() reply: FastifyReply,
  ) {
    const filename = `allotment-slip-${cartId}.pdf`;
    if (!this.storageService.documentExists(filename)) {
      throw new NotFoundException(
        `Allotment slip for Cart '${cartId}' is still generating or does not exist.`,
      );
    }

    const buffer = await this.storageService.getDocumentBuffer(filename);

    reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `inline; filename="allotment-slip-${cartId}.pdf"`)
      .header('Content-Length', buffer.length)
      .send(buffer);
  }

  /**
   * 3. Public / Warden QR Code Verification Endpoint
   * Validates cryptographic signature and queries live database to ensure bed was not revoked.
   */
  @Post('verify-qr')
  @HttpCode(HttpStatus.OK)
  async verifyQr(@Body() body: VerifyQrDto) {
    if (!body || !body.data || !body.sig) {
      throw new BadRequestException('Invalid QR code verification payload structure.');
    }

    const payloadString = JSON.stringify(body.data);
    const expectedSig = crypto
      .createHmac('sha256', this.secretKey)
      .update(payloadString)
      .digest('hex');

    const sigBuffer = Buffer.from(body.sig, 'hex');
    const expectedBuffer = Buffer.from(expectedSig, 'hex');

    // Cryptographic signature check with length guard for timingSafeEqual
    const isTamperProof =
      sigBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(sigBuffer, expectedBuffer);

    if (!isTamperProof) {
      return {
        isValid: false,
        status: 'TAMPERED',
        message: 'Cryptographic signature mismatch! The allotment slip has been forged or altered.',
      };
    }

    // Live Database Status Check: Verify if bed allocation is still active or revoked by change
    const student = await this.studentModel.findOne({ rollNumber: body.data.rollNumber });
    const cart = await this.cartModel.findById(body.data.cartId);

    let status = 'ACTIVE';
    let message = 'Allotment is authentic, verified, and officially active.';

    if (!cart) {
      status = 'EXPIRED';
      message = 'Associated booking cart record was not found.';
    } else if (student?.currentAllocation?.roomNumber && student.currentAllocation.roomNumber !== body.data.roomNumber) {
      status = 'REVOKED_BY_HOSTEL_CHANGE';
      message = `This slip was revoked. Student changed room to ${student.currentAllocation.roomNumber}.`;
    }

    return {
      isValid: status === 'ACTIVE',
      status,
      message,
      resident: {
        name: student?.name || 'Unknown Resident',
        rollNumber: body.data.rollNumber,
        allocatedRoom: `${body.data.roomNumber} - ${body.data.bedLabel}`,
        blockCode: body.data.blockCode,
        categoryCode: body.data.categoryCode,
        academicSession: body.data.academicSession,
        verifiedAt: new Date().toISOString(),
      },
    };
  }
}
