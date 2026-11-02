import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { StudentLoginDto } from './dto/student-login.dto';
import { AdminLoginDto } from './dto/admin-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Student Login endpoint
   * Validates Roll Number / Email against MongoDB student_profiles
   */
  @Post('student/login')
  @HttpCode(HttpStatus.OK)
  async studentLogin(@Body() dto: StudentLoginDto) {
    return this.authService.loginStudent(dto);
  }

  /**
   * Admin / Warden Login endpoint
   */
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  async adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.loginAdmin(dto);
  }

  /**
   * Complete System & Database Connectivity Verification Endpoint
   * Used by frontend SSR and client to test DB and backend health
   */
  @Get('test-connection')
  @HttpCode(HttpStatus.OK)
  async testConnection() {
    return this.authService.testSystemHealth();
  }
}

