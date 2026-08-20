import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PostKind } from '@hirestack/shared';
import { FeedService } from './feed.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('feed')
@Controller('feed')
export class FeedController {
  constructor(private readonly feed: FeedService) {}

  @Public()
  @Get()
  list(@CurrentUser() user?: RequestUser) {
    return this.feed.list(user?.id);
  }

  @ApiBearerAuth()
  @Post()
  create(
    @CurrentUser() user: RequestUser,
    @Body() body: { body: string; kind?: PostKind; jobId?: string },
  ) {
    return this.feed.create(user.id, body);
  }

  @ApiBearerAuth()
  @Post(':id/like')
  like(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.feed.like(user.id, id);
  }

  @ApiBearerAuth()
  @Delete(':id/like')
  unlike(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.feed.unlike(user.id, id);
  }

  @ApiBearerAuth()
  @Post(':id/comments')
  comment(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: { body: string },
  ) {
    return this.feed.comment(user.id, id, body.body);
  }
}
