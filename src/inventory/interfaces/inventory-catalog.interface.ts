import { AvailabilityTag } from '../enums/availability-tag.enum';
import { BedStatus } from '../enums/bed-status.enum';
import { ServiceType } from '../enums/service-type.enum';

export interface RoomCategoryCatalogItem {
  categoryCode: string;
  roomType: string;
  washroomType: string;
  seaterCount: number;
  hasPantry: boolean;
  annualFee: number;
  lowSeatThreshold: number;
  availableSeats: number;
  availabilityTag: AvailabilityTag;
}

export interface AncillaryServiceCatalogItem {
  serviceCode: string;
  serviceType: ServiceType;
  title: string;
  fee: number;
  isMandatory: boolean;
}

export interface InventoryCatalogResponse {
  tenantId: string;
  academicSession: string;
  gender?: string;
  categories: RoomCategoryCatalogItem[];
  ancillaryServices: AncillaryServiceCatalogItem[];
  serverTime: number;
}

export interface BedDetailItem {
  bedLabel: string;
  status: BedStatus;
  isAvailable: boolean;
  lockExpiresAt?: Date | null;
}

export interface RoomDetailItem {
  blockCode: string;
  roomNumber: string;
  floor: number;
  categoryCode: string;
  totalBeds: number;
  availableBeds: number;
  beds: BedDetailItem[];
}
