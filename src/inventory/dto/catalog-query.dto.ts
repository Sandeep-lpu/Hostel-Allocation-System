import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Gender } from '../enums/gender.enum';
import { INVENTORY_CONSTANTS } from '../constants/inventory.constants';

export class CatalogQueryDto {
  @IsOptional()
  @IsString()
  tenantId?: string = INVENTORY_CONSTANTS.DEFAULTS.TENANT_ID;

  @IsOptional()
  @IsString()
  sessionId?: string = INVENTORY_CONSTANTS.DEFAULTS.SESSION_ID;

  @IsOptional()
  @IsString()
  academicSession?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender = Gender.MALE;
}
