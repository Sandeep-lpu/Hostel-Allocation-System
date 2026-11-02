import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AdminLoginDto {
  @IsNotEmpty({ message: 'Admin email address is required.' })
  @IsEmail({}, { message: 'Must be a valid university email address.' })
  email: string;

  @IsNotEmpty({ message: 'Password is required.' })
  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  role?: string;
}

