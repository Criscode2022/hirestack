import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@hirestack/shared';
import { BillingService } from './billing.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/types/request-user';

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
  workspace(@CurrentUser() user: RequestUser, @Headers('authorization') authorization?: string) {
    return this.billing.workspace(user.id, authorization);
  }

  @ApiBearerAuth()
  @Roles(UserRole.EMPLOYER)
  @Get('invoices')
  invoices() {
    return this.billing.invoiceHistory();
  }

  @ApiBearerAuth()
  @Roles(UserRole.EMPLOYER)
  @Post('subscribe')
  subscribe(
    @CurrentUser() user: RequestUser,
    @Body() dto: SubscribeDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.billing.subscribe(user.id, dto.plan, authorization);
  }
}
