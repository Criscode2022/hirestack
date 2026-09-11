import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole, type JobSearchQuery } from '@hirestack/shared';
import { JobsService } from './jobs.service';
import { UpsertJobDto } from './dto/job.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/types/request-user';
import { nextFeaturedIds, serializeFeaturedCookie } from '../common/featured-overlay';
import { shouldUseUpstream } from '../common/upstream';

@ApiTags('jobs')
@Controller()
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Public()
  @Get('jobs')
  search(
    @Query() query: JobSearchQuery,
    @Req() req: Request,
    @Headers('cookie') cookie?: string,
    @Headers('x-hirestack-featured') featuredHeader?: string,
  ) {
    return this.jobs.search(query, cookie, featuredHeader, req.originalUrl);
  }

  @Public()
  @Get('jobs/featured')
  featured(
    @Headers('cookie') cookie?: string,
    @Headers('x-hirestack-featured') featuredHeader?: string,
  ) {
    return this.jobs.featured(cookie, featuredHeader);
  }

  @ApiBearerAuth()
  @Roles(UserRole.CANDIDATE)
  @Get('jobs/recommended')
  recommended(@CurrentUser() user: RequestUser) {
    return this.jobs.recommended(user.id);
  }

  @Public()
  @Get('jobs/:slug')
  detail(
    @Param('slug') slug: string,
    @Headers('cookie') cookie?: string,
    @Headers('x-hirestack-featured') featuredHeader?: string,
  ) {
    return this.jobs.getBySlug(slug, cookie, featuredHeader);
  }

  @ApiBearerAuth()
  @Roles(UserRole.EMPLOYER)
  @Post('jobs')
  create(@CurrentUser() user: RequestUser, @Body() dto: UpsertJobDto) {
    return this.jobs.create(user.id, dto);
  }

  @ApiBearerAuth()
  @Roles(UserRole.EMPLOYER)
  @Patch('jobs/:id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpsertJobDto,
  ) {
    return this.jobs.update(user.id, id, dto);
  }

  @ApiBearerAuth()
  @Roles(UserRole.EMPLOYER)
  @Post('jobs/:id/publish')
  publish(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.jobs.publish(user.id, id);
  }

  @ApiBearerAuth()
  @Roles(UserRole.EMPLOYER)
  @Post('jobs/:id/feature')
  async feature(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: { featured: boolean },
    @Res({ passthrough: true }) res: Response,
    @Headers('authorization') authorization?: string,
    @Headers('cookie') cookie?: string,
    @Headers('x-hirestack-featured') featuredHeader?: string,
  ) {
    const featured = Boolean(body.featured);
    const result = await this.jobs.feature(user.id, id, featured, authorization, cookie, featuredHeader);
    if (shouldUseUpstream()) {
      res.setHeader('Set-Cookie', serializeFeaturedCookie(nextFeaturedIds(cookie, id, featured, featuredHeader)));
    }
    return result;
  }

  @ApiBearerAuth()
  @Roles(UserRole.EMPLOYER)
  @Post('jobs/:id/close')
  close(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.jobs.close(user.id, id);
  }

  @ApiBearerAuth()
  @Roles(UserRole.EMPLOYER)
  @Get('me/jobs')
  mine(
    @CurrentUser() user: RequestUser,
    @Headers('authorization') authorization?: string,
    @Headers('cookie') cookie?: string,
    @Headers('x-hirestack-featured') featuredHeader?: string,
  ) {
    return this.jobs.mine(user.id, authorization, cookie, featuredHeader);
  }

  @ApiBearerAuth()
  @Roles(UserRole.CANDIDATE)
  @Post('jobs/:id/save')
  save(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.jobs.save(user.id, id);
  }

  @ApiBearerAuth()
  @Roles(UserRole.CANDIDATE)
  @Delete('jobs/:id/save')
  unsave(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.jobs.unsave(user.id, id);
  }

  @ApiBearerAuth()
  @Roles(UserRole.CANDIDATE)
  @Get('me/saved-jobs')
  saved(@CurrentUser() user: RequestUser) {
    return this.jobs.savedJobs(user.id);
  }

  @ApiBearerAuth()
  @Roles(UserRole.CANDIDATE)
  @Get('me/saved-searches')
  searches(@CurrentUser() user: RequestUser) {
    return this.jobs.listSavedSearches(user.id);
  }

  @ApiBearerAuth()
  @Roles(UserRole.CANDIDATE)
  @Post('me/saved-searches')
  createSearch(
    @CurrentUser() user: RequestUser,
    @Body() body: { name: string; queryJson: Record<string, unknown> },
  ) {
    return this.jobs.createSavedSearch(user.id, body.name, body.queryJson as Record<string, string | number | boolean | null>);
  }

  @ApiBearerAuth()
  @Roles(UserRole.CANDIDATE)
  @Delete('me/saved-searches/:id')
  deleteSearch(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.jobs.deleteSavedSearch(user.id, id);
  }
}
