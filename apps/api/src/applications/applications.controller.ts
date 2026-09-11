import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApplicationStatus, UserRole } from '@hirestack/shared';
import { ApplicationsService } from './applications.service';
import { ApplyDto, TransitionDto } from './dto/apply.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('applications')
@ApiBearerAuth()
@Controller()
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Roles(UserRole.CANDIDATE)
  @Post('jobs/:id/applications')
  apply(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: ApplyDto,
  ) {
    return this.applications.apply(user.id, id, dto);
  }

  @Roles(UserRole.CANDIDATE)
  @Get('me/applications')
  mine(@CurrentUser() user: RequestUser) {
    return this.applications.mine(user.id);
  }

  @Roles(UserRole.CANDIDATE)
  @Post('applications/:id/withdraw')
  withdraw(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.applications.withdraw(user.id, id);
  }

  @Roles(UserRole.EMPLOYER)
  @Get('jobs/:id/applications')
  forJob(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Query('status') status?: ApplicationStatus,
    @Query('skill') skill?: string,
    @Query('from') from?: string,
  ) {
    return this.applications.forJob(user.id, id, { status, skill, from });
  }

  @Roles(UserRole.EMPLOYER, UserRole.ADMIN)
  @Post('applications/:id/transition')
  transition(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: TransitionDto,
  ) {
    return this.applications.transition(user.id, user.role, id, dto);
  }

  @Roles(UserRole.EMPLOYER)
  @Get('me/employer-dashboard')
  dashboard(@CurrentUser() user: RequestUser, @Headers('authorization') authorization?: string) {
    return this.applications.dashboard(user.id, authorization);
  }
}
