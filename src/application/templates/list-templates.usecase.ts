import { Injectable, Inject } from '@nestjs/common';
import type { Template } from '../../domain/entities/template.entity';
import type { TemplateRepository } from '../../domain/repositories/template.repository';
import { TEMPLATE_REPOSITORY } from './repository.tokens';

@Injectable()
export class ListTemplatesUseCase {
  constructor(
    @Inject(TEMPLATE_REPOSITORY)
    private readonly templateRepository: TemplateRepository,
  ) {}

  async execute(companyId: string): Promise<Template[]> {
    return this.templateRepository.list(companyId);
  }
}
