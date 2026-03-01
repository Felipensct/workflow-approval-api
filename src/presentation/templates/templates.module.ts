import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplatePersistence } from '../../infrastructure/database/entities/template.persistence';
import { TemplateVersionPersistence } from '../../infrastructure/database/entities/template-version.persistence';
import { TemplateRepositoryImpl } from '../../infrastructure/database/repositories/template.repository.impl';
import { TemplateVersionRepositoryImpl } from '../../infrastructure/database/repositories/template-version.repository.impl';
import {
  TEMPLATE_REPOSITORY,
  TEMPLATE_VERSION_REPOSITORY,
} from '../../application/templates/repository.tokens';
import { CreateTemplateUseCase } from '../../application/templates/create-template.usecase';
import { ListTemplatesUseCase } from '../../application/templates/list-templates.usecase';
import { GetTemplateUseCase } from '../../application/templates/get-template.usecase';
import { CreateVersionUseCase } from '../../application/templates/create-version.usecase';
import { PublishVersionUseCase } from '../../application/templates/publish-version.usecase';
import { TemplatesController } from './templates.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([TemplatePersistence, TemplateVersionPersistence]),
  ],
  controllers: [TemplatesController],
  providers: [
    {
      provide: TEMPLATE_REPOSITORY,
      useClass: TemplateRepositoryImpl,
    },
    {
      provide: TEMPLATE_VERSION_REPOSITORY,
      useClass: TemplateVersionRepositoryImpl,
    },
    CreateTemplateUseCase,
    ListTemplatesUseCase,
    GetTemplateUseCase,
    CreateVersionUseCase,
    PublishVersionUseCase,
  ],
})
export class TemplatesModule {}
