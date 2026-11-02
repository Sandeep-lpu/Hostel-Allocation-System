import { IsOptional, IsString } from 'class-validator';
import { INVENTORY_CONSTANTS } from '../constants/inventory.constants';

export class RoomQueryDto {
  @IsOptional()
  @IsString()
  tenantId?: string = INVENTORY_CONSTANTS.DEFAULTS.TENANT_ID;

  @IsOptional()
  @IsString()
  sessionId?: string = INVENTORY_CONSTANTS.DEFAULTS.SESSION_ID;

  @IsOptional()
  @IsString()
  academicSession?: string;
}
