import { Injectable, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { TemplateVersion } from '../../domain/entities/template-version.entity';
import type { TemplateRepository } from '../../domain/repositories/template.repository';
import type { TemplateVersionRepository } from '../../domain/repositories/template-version.repository';
import {
  TEMPLATE_REPOSITORY,
  TEMPLATE_VERSION_REPOSITORY,
} from './repository.tokens';

export interface CreateVersionInput {
  companyId: string;
  templateId: string;
  definition: Record<string, unknown>;
}

@Injectable()
export class CreateVersionUseCase {
  constructor(
    @Inject(TEMPLATE_REPOSITORY)
    private readonly templateRepository: TemplateRepository,
    @Inject(TEMPLATE_VERSION_REPOSITORY)
    private readonly versionRepository: TemplateVersionRepository,
  ) {}

  async execute(input: CreateVersionInput): Promise<TemplateVersion> {
    const template = await this.templateRepository.findById(
      input.templateId,
      input.companyId,
    );
    if (!template) {
      throw new Error('Template não encontrado');
    }
    const existing = await this.versionRepository.findByTemplateId(
      input.templateId,
      input.companyId,
    );
    const nextNumber =
      existing.length === 0 ? 1 : Math.max(...existing.map((v) => v.versionNumber)) + 1;
    const now = new Date();
    const version = new TemplateVersion(
      randomUUID(),
      input.templateId,
      nextNumber,
      'draft',
      input.definition,
      null,
      now,
    );
    return this.versionRepository.save(version);
  }
}
