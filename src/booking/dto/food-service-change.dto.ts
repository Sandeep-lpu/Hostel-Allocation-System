import { IsBoolean, IsNotEmpty, IsOptional, IsString, Equals } from 'class-validator';

/**
 * Service & Food Upgrade DTO
 * For students upgrading Mess, Laundry, or Gym packages without moving physical beds.
 */
export class FoodServiceChangeDto {
  @IsString()
  @IsNotEmpty()
  selectedMessCode: string;

  @IsOptional()
  @IsBoolean()
  includeLaundry?: boolean = false;

  @IsOptional()
  @IsBoolean()
  includeGym?: boolean = false;

  @IsBoolean()
  @Equals(true, {
    message: 'You must accept the terms for service modification',
  })
  undertakingAccepted: boolean;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  academicSession?: string;
}

