import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { HealthModule } from './presentation/health/health.module';
import { SharedModule } from './presentation/shared/shared.module';
import { TemplatesModule } from './presentation/templates/templates.module';
import { InstancesModule } from './presentation/instances/instances.module';
import { ApprovalsModule } from './presentation/approvals/approvals.module';
import { DelegationsModule } from './presentation/delegations/delegations.module';
import { MessagingModule } from './presentation/messaging/messaging.module';
import { AnalyticsModule } from './presentation/analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'incicle',
      autoLoadEntities: true,
      synchronize: false,
      migrationsRun: false,
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    }),
    SharedModule,
    HealthModule,
    TemplatesModule,
    InstancesModule,
    ApprovalsModule,
    DelegationsModule,
    MessagingModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
