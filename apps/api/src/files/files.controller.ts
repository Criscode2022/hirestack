import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@hirestack/shared';
import { FilesService } from './files.service';
import { Roles } from '../common/decorators/roles.decorator';
import { memoryStorage } from 'multer';

@ApiTags('files')
@ApiBearerAuth()
@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Roles(UserRole.CANDIDATE)
  @Post('resume')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  resume(@UploadedFile() file: Express.Multer.File) {
    return this.files.uploadResume(file);
  }

  @Roles(UserRole.EMPLOYER)
  @Post('logo')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  logo(@UploadedFile() file: Express.Multer.File) {
    return this.files.uploadLogo(file);
  }
}
