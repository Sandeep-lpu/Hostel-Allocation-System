import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  Equals,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SpecificBedSelectionDto {
  @IsString()
  @IsNotEmpty()
  blockCode: string; // e.g. "BH-01"

  @IsString()
  @IsNotEmpty()
  roomNumber: string; // e.g. "A619"

  @IsString()
  @IsNotEmpty()
  bedLabel: string; // e.g. "Bed C"
}

/**
 * Residential Bed Hold Request DTO
 */
export class CreateHoldDto {
  @IsString()
  @IsNotEmpty()
  selectedCategoryCode: string; // e.g. "STUDIO_AC_3S_PANTRY", "STD_AC_2S"

  @IsString()
  @IsNotEmpty()
  selectedMessCode: string; // e.g. "MESS_STD_NORTH_3M"

  @IsOptional()
  @IsBoolean()
  includeLaundry?: boolean = false;

  @IsOptional()
  @IsBoolean()
  includeGym?: boolean = false;

  @IsString()
  @IsNotEmpty()
  mobile: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  /**
   * Mandatory undertaking:
   * "I hereby undertake to pay the difference in amount, if any, due to the seater change requested by me"
   */
  @IsBoolean()
  @Equals(true, {
    message:
      'You must accept the undertaking: "I hereby undertake to pay the difference in amount, if any, due to the seater change requested by me"',
  })
  undertakingAccepted: boolean;

  /**
   * Optional: Specific physical bed selection (e.g. BH-01, Room A619, Bed C).
   * If omitted, the engine automatically selects any available bed in the category.
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => SpecificBedSelectionDto)
  specificBedSelection?: SpecificBedSelectionDto;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  academicSession?: string;
}

