import { Module } from '@nestjs/common';
import { AdminController, ReportsController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  controllers: [AdminController, ReportsController],
  providers: [AdminService],
})
export class AdminModule {}
