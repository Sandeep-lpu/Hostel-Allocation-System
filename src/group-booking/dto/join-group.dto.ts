import { Equals, IsBoolean, IsOptional, IsString } from 'class-validator';

export class JoinGroupDto {
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

