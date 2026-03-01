import { Injectable, Inject } from '@nestjs/common';
import type { TemplateVersion } from '../../domain/entities/template-version.entity';
import type { TemplateVersionRepository } from '../../domain/repositories/template-version.repository';
import { TEMPLATE_VERSION_REPOSITORY } from './repository.tokens';

export interface PublishVersionInput {
  companyId: string;
  templateId: string;
  versionId: string;
}

@Injectable()
export class PublishVersionUseCase {
  constructor(
    @Inject(TEMPLATE_VERSION_REPOSITORY)
    private readonly versionRepository: TemplateVersionRepository,
  ) {}

  async execute(input: PublishVersionInput): Promise<TemplateVersion> {
    const version = await this.versionRepository.findById(
      input.versionId,
      input.companyId,
    );
    if (!version) {
      throw new Error('Versão não encontrada');
    }
    if (version.templateId !== input.templateId) {
      throw new Error('Versão não pertence ao template');
    }
    version.status = 'published';
    version.publishedAt = new Date();
    return this.versionRepository.save(version);
  }
}
