import { Body, Controller, Get, Post } from '@nestjs/common';
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
  workspace(@CurrentUser() user: RequestUser) {
    return this.billing.workspace(user.id);
  }

  @ApiBearerAuth()
  @Roles(UserRole.EMPLOYER)
  @Post('subscribe')
  subscribe(@CurrentUser() user: RequestUser, @Body() dto: SubscribeDto) {
    return this.billing.subscribe(user.id, dto.plan);
  }
}
