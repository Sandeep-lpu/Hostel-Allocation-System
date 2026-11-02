import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MemberPreferenceDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  selectedMessCode: string;

  @IsOptional()
  @IsBoolean()
  includeLaundry?: boolean = false;

  @IsOptional()
  @IsBoolean()
  includeGym?: boolean = false;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsString()
  email?: string;
}

export class AllocateGroupRoomDto {
  @IsOptional()
  @IsBoolean()
  allowAdjacentSplit?: boolean = false;

  @IsOptional()
  @IsString()
  defaultMessCode?: string = 'MESS_STD_NORTH_3M';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MemberPreferenceDto)
  memberPreferences?: MemberPreferenceDto[];

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  academicSession?: string;
}

