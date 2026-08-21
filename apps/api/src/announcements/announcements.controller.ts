import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole, type Workplace } from '@hirestack/shared';
import { AnnouncementsService } from './announcements.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('announcements')
@Controller()
export class AnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  @Public()
  @Get('announcements')
  list(@CurrentUser() user?: RequestUser) {
    return this.announcements.list(user?.id);
  }

  @ApiBearerAuth()
  @Roles(UserRole.EMPLOYER)
  @Post('announcements')
  create(
    @CurrentUser() user: RequestUser,
    @Body() body: { title: string; body: string; location?: string; workplace?: Workplace },
  ) {
    return this.announcements.create(user.id, body);
  }

  @ApiBearerAuth()
  @Roles(UserRole.CANDIDATE)
  @Post('announcements/:id/apply')
  apply(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: { note?: string },
  ) {
    return this.announcements.apply(user.id, id, body.note);
  }

  @ApiBearerAuth()
  @Roles(UserRole.EMPLOYER)
  @Post('announcements/:id/close')
  close(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.announcements.close(user.id, id);
  }
}