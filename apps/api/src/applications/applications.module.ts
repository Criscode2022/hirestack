import { Module } from '@nestjs/common';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { MailService } from '../mail/mail.service';

@Module({
  controllers: [ApplicationsController],
  providers: [ApplicationsService, MailService],
})
export class ApplicationsModule {}
