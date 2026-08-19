import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole, type JobSearchQuery } from '@hirestack/shared';
import { JobsService } from './jobs.service';
import { UpsertJobDto } from './dto/job.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('jobs')
@Controller()
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Public()
  @Get('jobs')
  search(@Query() query: JobSearchQuery) {
    return this.jobs.search(query);
  }

  @Public()
  @Get('jobs/featured')
  featured() {
    return this.jobs.featured();
  }

  @Public()
  @Get('jobs/:slug')
  detail(@Param('slug') slug: string) {
    return this.jobs.getBySlug(slug);
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
  @Post('jobs/:id/close')
  close(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.jobs.close(user.id, id);
  }

  @ApiBearerAuth()
  @Roles(UserRole.EMPLOYER)
  @Get('me/jobs')
  mine(@CurrentUser() user: RequestUser) {
    return this.jobs.mine(user.id);
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
