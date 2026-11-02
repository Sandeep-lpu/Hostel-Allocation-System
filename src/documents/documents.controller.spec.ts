import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import * as crypto from 'crypto';
import { DocumentsController } from './documents.controller';
import { ResidentialCart } from '../booking/schemas/residential-cart.schema';
import { BedInventory } from '../inventory/schemas/bed-inventory.schema';
import { StudentProfile } from '../student/schemas/student-profile.schema';
import { StorageService } from '../storage/storage.service';

describe('DocumentsController', () => {
  let controller: DocumentsController;
  let mockCartModel: any;
  let mockBedModel: any;
  let mockStudentModel: any;
  let mockStorageService: any;
  const testSecret = 'vwr_super_secure_distributed_engine_secret_2026';

  beforeEach(async () => {
    mockCartModel = {
      findById: jest.fn(),
    };
    mockBedModel = {
      findById: jest.fn(),
    };
    mockStudentModel = {
      findOne: jest.fn(),
    };
    mockStorageService = {
      documentExists: jest.fn(),
      getDocumentBuffer: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        { provide: getModelToken(ResidentialCart.name), useValue: mockCartModel },
        { provide: getModelToken(BedInventory.name), useValue: mockBedModel },
        { provide: getModelToken(StudentProfile.name), useValue: mockStudentModel },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    controller = module.get<DocumentsController>(DocumentsController);
  });

  it('should verify valid tamper-proof QR code signatures', async () => {
    const data = {
      cartId: 'cart_123',
      studentId: 'STU-001',
      rollNumber: '2024BCSE-001',
      blockCode: 'BH-01',
      roomNumber: 'A619',
      bedLabel: 'Bed C',
      categoryCode: 'STUDIO_AC_3S_PANTRY',
      academicSession: 'hostel-allotment-2026',
      status: 'CONFIRMED',
      issuedAt: 1793400000,
    };

    const payloadString = JSON.stringify(data);
    const validSig = crypto.createHmac('sha256', testSecret).update(payloadString).digest('hex');

    mockCartModel.findById.mockResolvedValueOnce({ _id: 'cart_123' });
    mockStudentModel.findOne.mockResolvedValueOnce({
      rollNumber: '2024BCSE-001',
      name: 'Aditya Test',
      currentAllocation: { roomNumber: 'A619' },
    });

    const result = await controller.verifyQr({ data, sig: validSig });
    expect(result.isValid).toBe(true);
    expect(result.status).toBe('ACTIVE');
    expect(result.resident.rollNumber).toBe('2024BCSE-001');
  });

  it('should reject tampered QR code signatures with TAMPERED status', async () => {
    const data = {
      cartId: 'cart_123',
      studentId: 'STU-001',
      rollNumber: '2024BCSE-001',
      blockCode: 'BH-01',
      roomNumber: 'A619',
      bedLabel: 'Bed C',
      categoryCode: 'STUDIO_AC_3S_PANTRY',
      academicSession: 'hostel-allotment-2026',
      status: 'CONFIRMED',
      issuedAt: 1793400000,
    };

    const result = await controller.verifyQr({ data, sig: 'deadbeef_invalid_tampered_signature_123' });
    expect(result.isValid).toBe(false);
    expect(result.status).toBe('TAMPERED');
  });
});

