import { BadRequestException } from '@nestjs/common';
import { FilesService } from '../src/files/files.service';

describe('FilesService', () => {
  const previous = process.env.BLOB_READ_WRITE_TOKEN;

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.BLOB_READ_WRITE_TOKEN;
    } else {
      process.env.BLOB_READ_WRITE_TOKEN = previous;
    }
  });

  it('refuses uploads when object storage is not configured', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    const service = new FilesService();
    await expect(
      service.uploadResume({
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 120,
        buffer: Buffer.from('%PDF'),
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
