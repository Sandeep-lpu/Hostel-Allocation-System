import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class StudentLoginDto {
  @IsNotEmpty({ message: 'Roll number or student email is required.' })
  @IsString()
  identifier: string;

  @IsOptional()
  @IsString()
  passwordOrPin?: string;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  academicSession?: string;
}

