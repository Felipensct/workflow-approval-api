import { Injectable, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Template } from '../../domain/entities/template.entity';
import type { TemplateRepository } from '../../domain/repositories/template.repository';
import { TEMPLATE_REPOSITORY } from './repository.tokens';

export interface CreateTemplateInput {
  companyId: string;
  name: string;
  description?: string | null;
}

@Injectable()
export class CreateTemplateUseCase {
  constructor(
    @Inject(TEMPLATE_REPOSITORY)
    private readonly templateRepository: TemplateRepository,
  ) {}

  async execute(input: CreateTemplateInput): Promise<Template> {
    const now = new Date();
    const template = new Template(
      randomUUID(),
      input.companyId,
      input.name,
      input.description ?? null,
      now,
    );
    return this.templateRepository.save(template);
  }
}
