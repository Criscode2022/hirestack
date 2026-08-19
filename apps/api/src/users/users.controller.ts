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
}
