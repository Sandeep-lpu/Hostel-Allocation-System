import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  Equals,
} from 'class-validator';

export class CreateGroupDto {
  @IsInt()
  @Min(2)
  @Max(4)
  targetSeater: number; // 2, 3, or 4

  @IsString()
  @IsNotEmpty()
  categoryCode: string; // e.g. "STD_AC_4S", "STUDIO_AC_3S_PANTRY", "STD_AC_2S"

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  invitedRollNumbers?: string[];

  @IsBoolean()
  @Equals(true, {
    message:
      'You must accept the group undertaking to pay the difference in amount due to room/seater changes.',
  })
  undertakingAccepted: boolean;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  academicSession?: string;
}

