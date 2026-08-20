import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NetworkService } from './network.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('network')
@Controller()
export class NetworkController {
  constructor(private readonly network: NetworkService) {}

  @Public()
  @Get('people')
  search(@Query('q') q?: string) {
    return this.network.searchPeople(q);
  }

  @Public()
  @Get('people/:id')
  profile(@Param('id') id: string, @CurrentUser() user?: RequestUser) {
    return this.network.getPublicProfile(user?.id, id);
  }

  @ApiBearerAuth()
  @Post('people/:id/recommendations')
  recommend(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: { relationship: string; body: string },
  ) {
    return this.network.recommend(user.id, id, body);
  }

  @ApiBearerAuth()
  @Post('connections')
  request(@CurrentUser() user: RequestUser, @Body() body: { userId: string }) {
    return this.network.requestConnection(user.id, body.userId);
  }

  @ApiBearerAuth()
  @Post('connections/:id/respond')
  respond(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: { status: 'ACCEPTED' | 'DECLINED' },
  ) {
    return this.network.respond(user.id, id, body.status);
  }

  @ApiBearerAuth()
  @Get('me/connections')
  mine(@CurrentUser() user: RequestUser) {
    return this.network.mine(user.id);
  }

  @ApiBearerAuth()
  @Get('me/connection-requests')
  pending(@CurrentUser() user: RequestUser) {
    return this.network.pending(user.id);
  }

  @ApiBearerAuth()
  @Get('me/suggested')
  suggested(@CurrentUser() user: RequestUser) {
    return this.network.suggested(user.id);
  }

  @ApiBearerAuth()
  @Post('companies/:id/follow')
  follow(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.network.followCompany(user.id, id);
  }

  @ApiBearerAuth()
  @Delete('companies/:id/follow')
  unfollow(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.network.unfollowCompany(user.id, id);
  }

  @ApiBearerAuth()
  @Get('companies/:id/following')
  isFollowing(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.network.isFollowing(user.id, id);
  }

  @ApiBearerAuth()
  @Get('me/following')
  following(@CurrentUser() user: RequestUser) {
    return this.network.following(user.id);
  }
}
