import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  LoginInputSchema,
  type LoginInput,
  type LoginResult,
  type Recruiter,
} from '@clientready/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AdminAuthGuard, bearerToken, type AuthenticatedRequest } from './admin-auth.guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(
    @Body(new ZodValidationPipe(LoginInputSchema)) input: LoginInput,
  ): Promise<LoginResult> {
    const result = await this.auth.login(input.email, input.password);
    // Same message for unknown email and wrong password.
    if (!result) throw new UnauthorizedException('Invalid email or password');
    return result;
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() request: AuthenticatedRequest): Promise<void> {
    const token = bearerToken(request);
    if (token) await this.auth.logout(token);
  }

  @Get('me')
  @UseGuards(AdminAuthGuard)
  me(@Req() request: AuthenticatedRequest): Recruiter {
    if (!request.recruiter) throw new UnauthorizedException();
    return request.recruiter;
  }
}
