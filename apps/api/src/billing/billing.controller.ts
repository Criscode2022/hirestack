import { Body, Controller, Get, Headers, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@hirestack/shared';
import { BillingService } from './billing.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/types/request-user';
import { serializePlanCookie } from '../common/plan-overlay';
import { shouldUseUpstream } from '../common/upstream';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Public()
  @Get('plans')
  plans() {
    return this.billing.catalog();
  }

  @ApiBearerAuth()
  @Roles(UserRole.EMPLOYER)
  @Get('workspace')
  workspace(
    @CurrentUser() user: RequestUser,
    @Headers('authorization') authorization?: string,
    @Headers('cookie') cookie?: string,
    @Headers('x-hirestack-featured') featuredHeader?: string,
    @Headers('x-hirestack-plan') planHeader?: string,
  ) {
    return this.billing.workspace(user.id, authorization, cookie, featuredHeader, planHeader);
  }

  @ApiBearerAuth()
  @Roles(UserRole.EMPLOYER)
  @Get('invoices')
  invoices(
    @CurrentUser() user: RequestUser,
    @Headers('authorization') authorization?: string,
    @Headers('cookie') cookie?: string,
    @Headers('x-hirestack-featured') featuredHeader?: string,
    @Headers('x-hirestack-plan') planHeader?: string,
  ) {
    return this.billing.invoiceHistory(user.id, authorization, cookie, featuredHeader, planHeader);
  }

  @ApiBearerAuth()
  @Roles(UserRole.EMPLOYER)
  @Post('subscribe')
  async subscribe(
    @CurrentUser() user: RequestUser,
    @Body() dto: SubscribeDto,
    @Res({ passthrough: true }) res: Response,
    @Headers('authorization') authorization?: string,
    @Headers('cookie') cookie?: string,
    @Headers('x-hirestack-featured') featuredHeader?: string,
    @Headers('x-hirestack-plan') planHeader?: string,
  ) {
    const result = await this.billing.subscribe(
      user.id,
      dto.plan,
      authorization,
      cookie,
      featuredHeader,
      planHeader,
    );
    if (shouldUseUpstream()) {
      res.setHeader('Set-Cookie', serializePlanCookie(dto.plan));
    }
    return result;
  }
}
