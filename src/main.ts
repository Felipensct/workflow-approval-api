import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { VersioningType } from '@nestjs/common';
import { AppModule } from './app.module';
import { runMigrations } from './infrastructure/database/run-migrations';
import { tenantMiddleware } from './presentation/middleware/tenant.middleware';
import { DomainExceptionFilter } from './presentation/filters/domain-exception.filter';

async function bootstrap() {
  await runMigrations();

  const app = await NestFactory.create(AppModule);
  app.use(tenantMiddleware);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'v',
    defaultVersion: '1',
  });
  app.useGlobalFilters(new DomainExceptionFilter());

  const port = process.env.APP_PORT || 3000;
  await app.listen(port);
}

bootstrap().catch((err) => {
  console.error('Falha ao iniciar aplicação:', err);
  process.exit(1);
});
