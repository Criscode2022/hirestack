import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('notifications')
  list(@CurrentUser() user: RequestUser) {
    return this.notifications.list(user.id);
  }

  @Get('notifications/unread-count')
  unread(@CurrentUser() user: RequestUser) {
    return this.notifications.unreadCount(user.id).then((count) => ({ count }));
  }

  @Post('notifications/read')
  readAll(@CurrentUser() user: RequestUser) {
    return this.notifications.markRead(user.id);
  }

  @Post('notifications/:id/read')
  readOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.notifications.markRead(user.id, id);
  }
}
