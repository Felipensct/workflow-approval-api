import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import { TenantContext } from '../tenant/tenant-context';
import { CreateTemplateUseCase } from '../../application/templates/create-template.usecase';
import { ListTemplatesUseCase } from '../../application/templates/list-templates.usecase';
import { GetTemplateUseCase } from '../../application/templates/get-template.usecase';
import { CreateVersionUseCase } from '../../application/templates/create-version.usecase';
import { PublishVersionUseCase } from '../../application/templates/publish-version.usecase';
import { CreateTemplateDto } from './dtos/create-template.dto';
import { CreateVersionDto } from './dtos/create-version.dto';

@Controller('templates')
export class TemplatesController {
  constructor(
    private readonly tenant: TenantContext,
    private readonly createTemplate: CreateTemplateUseCase,
    private readonly listTemplates: ListTemplatesUseCase,
    private readonly getTemplate: GetTemplateUseCase,
    private readonly createVersionUseCase: CreateVersionUseCase,
    private readonly publishVersionUseCase: PublishVersionUseCase,
  ) {}

  @Post()
  async create(@Body() dto: CreateTemplateDto) {
    const template = await this.createTemplate.execute({
      companyId: this.tenant.companyId,
      name: dto.name,
      description: dto.description ?? null,
    });
    return this.toTemplateResponse(template);
  }

  @Get()
  async list() {
    const templates = await this.listTemplates.execute(this.tenant.companyId);
    return templates.map((t) => this.toTemplateResponse(t));
  }

  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const template = await this.getTemplate.execute(this.tenant.companyId, id);
    if (!template) {
      throw new NotFoundException('Template não encontrado');
    }
    return this.toTemplateResponse(template);
  }

  @Post(':id/versions')
  async createVersion(
    @Param('id', ParseUUIDPipe) templateId: string,
    @Body() dto: CreateVersionDto,
  ) {
    try {
      const version = await this.createVersionUseCase.execute({
        companyId: this.tenant.companyId,
        templateId,
        definition: dto.definition,
      });
      return this.toVersionResponse(version);
    } catch (err) {
      if (err instanceof Error && err.message === 'Template não encontrado') {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }

  @Post(':id/versions/:versionId/publish')
  async publishVersion(
    @Param('id', ParseUUIDPipe) templateId: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ) {
    try {
      const version = await this.publishVersionUseCase.execute({
        companyId: this.tenant.companyId,
        templateId,
        versionId,
      });
      return this.toVersionResponse(version);
    } catch (err) {
      if (err instanceof Error && err.message === 'Versão não encontrada') {
        throw new NotFoundException(err.message);
      }
      if (err instanceof Error && err.message === 'Versão não pertence ao template') {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }

  private toTemplateResponse(t: { id: string; name: string; description: string | null; createdAt: Date }) {
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      created_at: t.createdAt,
    };
  }

  private toVersionResponse(v: {
    id: string;
    templateId: string;
    versionNumber: number;
    status: string;
    definition: Record<string, unknown>;
    publishedAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: v.id,
      template_id: v.templateId,
      version_number: v.versionNumber,
      status: v.status,
      definition: v.definition,
      published_at: v.publishedAt,
      created_at: v.createdAt,
    };
  }
}
