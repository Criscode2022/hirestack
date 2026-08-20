import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SetSkillsDto } from './dto/set-skills.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('users')
@ApiBearerAuth()
@Controller()
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return this.users.getMe(user.id);
  }

  @Patch('me')
  update(@CurrentUser() user: RequestUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateMe(user.id, dto);
  }

  @Post('me/skills')
  skills(@CurrentUser() user: RequestUser, @Body() dto: SetSkillsDto) {
    return this.users.setSkills(user.id, dto);
  }

  @Get('me/resumes')
  resumes(@CurrentUser() user: RequestUser) {
    return this.users.listResumes(user.id);
  }

  @Post('me/resumes')
  createResume(
    @CurrentUser() user: RequestUser,
    @Body() body: { url: string; fileName: string; mimeType: string; sizeBytes: number },
  ) {
    return this.users.createResume(user.id, body);
  }

  @Delete('me/resumes/:id')
  deleteResume(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.users.deleteResume(user.id, id);
  }

  @Get('me/experience')
  experience(@CurrentUser() user: RequestUser) {
    return this.users.listExperience(user.id);
  }

  @Post('me/experience')
  addExperience(
    @CurrentUser() user: RequestUser,
    @Body()
    body: {
      title: string;
      companyName: string;
      location?: string;
      startDate: string;
      endDate?: string;
      isCurrent?: boolean;
      description?: string;
    },
  ) {
    return this.users.addExperience(user.id, body);
  }

  @Delete('me/experience/:id')
  removeExperience(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.users.removeExperience(user.id, id);
  }

  @Get('me/education')
  education(@CurrentUser() user: RequestUser) {
    return this.users.listEducation(user.id);
  }

  @Post('me/education')
  addEducation(
    @CurrentUser() user: RequestUser,
    @Body()
    body: {
      school: string;
      degree?: string;
      field?: string;
      startYear?: number;
      endYear?: number;
    },
  ) {
    return this.users.addEducation(user.id, body);
  }

  @Delete('me/education/:id')
  removeEducation(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.users.removeEducation(user.id, id);
  }

  @Get('me/projects')
  projects(@CurrentUser() user: RequestUser) {
    return this.users.listProjects(user.id);
  }

  @Post('me/projects')
  addProject(
    @CurrentUser() user: RequestUser,
    @Body() body: { title: string; url?: string; description?: string },
  ) {
    return this.users.addProject(user.id, body);
  }

  @Delete('me/projects/:id')
  removeProject(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.users.removeProject(user.id, id);
  }
}
