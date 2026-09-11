import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { HttpErrorFilter } from './common/filters/http-exception.filter';
import { UpstreamProxyMiddleware } from './common/upstream.middleware';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CompaniesModule } from './companies/companies.module';
import { JobsModule } from './jobs/jobs.module';
import { ApplicationsModule } from './applications/applications.module';
import { FilesModule } from './files/files.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';
import { NotificationsModule } from './notifications/notifications.module';
import { NetworkModule } from './network/network.module';
import { MessagingModule } from './messaging/messaging.module';
import { FeedModule } from './feed/feed.module';
import { MarketModule } from './market/market.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { BillingModule } from './billing/billing.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 120 }],
    }),
    PrismaModule,
    MailModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    JobsModule,
    ApplicationsModule,
    FilesModule,
    AdminModule,
    HealthModule,
    NotificationsModule,
    NetworkModule,
    MessagingModule,
    FeedModule,
    MarketModule,
    AnnouncementsModule,
    BillingModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: HttpErrorFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(UpstreamProxyMiddleware).forRoutes('*');
  }
}
