import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MessagingService } from './messaging.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('messaging')
@ApiBearerAuth()
@Controller()
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

  @Get('conversations')
  inbox(@CurrentUser() user: RequestUser) {
    return this.messaging.inbox(user.id);
  }

  @Get('conversations/unread-count')
  unread(@CurrentUser() user: RequestUser) {
    return this.messaging.unreadCount(user.id).then((count) => ({ count }));
  }

  @Post('conversations')
  start(@CurrentUser() user: RequestUser, @Body() body: { userId: string; jobId?: string }) {
    return this.messaging.start(user.id, body.userId, body.jobId);
  }

  @Get('conversations/:id')
  detail(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.messaging.detail(user.id, id);
  }

  @Post('conversations/:id/messages')
  send(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: { body: string },
  ) {
    return this.messaging.send(user.id, id, body.body);
  }
}
