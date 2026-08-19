import { BadRequestException, Injectable } from '@nestjs/common';
import { put } from '@vercel/blob';
import { MAX_RESUME_BYTES } from '@hirestack/shared';

@Injectable()
export class FilesService {
  async uploadResume(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Resumes must be PDF files');
    }
    if (file.size > MAX_RESUME_BYTES) {
      throw new BadRequestException('Resume must be 5MB or smaller');
    }
    return this.put(file, 'resumes');
  }

  async uploadLogo(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.mimetype)) {
      throw new BadRequestException('Logos must be PNG, JPEG, WebP, or SVG');
    }
    if (file.size > 2 * 1024 * 1024) {
      throw new BadRequestException('Logo must be 2MB or smaller');
    }
    return this.put(file, 'logos');
  }

  private async put(file: Express.Multer.File, folder: string) {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      throw new BadRequestException('File uploads are not configured (missing BLOB_READ_WRITE_TOKEN)');
    }
    const pathname = `${folder}/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const blob = await put(pathname, file.buffer, {
      access: 'public',
      token,
      contentType: file.mimetype,
    });
    return { url: blob.url, pathname: blob.pathname };
  }
}
