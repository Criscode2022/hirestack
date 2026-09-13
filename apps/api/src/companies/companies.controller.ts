import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@hirestack/shared';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/create-company.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('companies')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @ApiBearerAuth()
  @Roles(UserRole.EMPLOYER)
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateCompanyDto) {
    return this.companies.create(user.id, dto);
  }

  @Public()
  @Get()
  list() {
    return this.companies.list();
  }

  @Public()
  @Get(':slug')
  get(@Param('slug') slug: string, @CurrentUser() user?: RequestUser) {
    return this.companies.getBySlug(slug, user);
  }

  @ApiBearerAuth()
  @Roles(UserRole.EMPLOYER)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companies.update(id, user.id, dto);
  }
}
