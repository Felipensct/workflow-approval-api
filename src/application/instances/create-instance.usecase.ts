import { Injectable, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { WorkflowInstance } from '../../domain/entities/workflow-instance.entity';
import type { InstanceRepository } from '../../domain/repositories/instance.repository';
import type { TemplateVersionRepository } from '../../domain/repositories/template-version.repository';
import { INSTANCE_REPOSITORY } from './repository.tokens';
import { TEMPLATE_VERSION_REPOSITORY } from '../templates/repository.tokens';
import { createSnapshot } from '../../domain/value-objects/snapshot.vo';

export interface CreateInstanceInput {
  companyId: string;
  templateVersionId: string;
}

@Injectable()
export class CreateInstanceUseCase {
  constructor(
    @Inject(INSTANCE_REPOSITORY)
    private readonly instanceRepository: InstanceRepository,
    @Inject(TEMPLATE_VERSION_REPOSITORY)
    private readonly versionRepository: TemplateVersionRepository,
  ) {}

  async execute(input: CreateInstanceInput): Promise<WorkflowInstance> {
    const version = await this.versionRepository.findById(
      input.templateVersionId,
      input.companyId,
    );
    if (!version) {
      throw new Error('Versão do template não encontrada');
    }
    const now = new Date();
    const placeholderSnapshot = createSnapshot(
      {
        id: version.id,
        version_number: version.versionNumber,
        definition: version.definition,
      },
      [],
      {},
      [],
    );
    const instance = new WorkflowInstance(
      randomUUID(),
      input.companyId,
      input.templateVersionId,
      placeholderSnapshot,
      'draft',
      null,
      now,
    );
    return this.instanceRepository.save(instance);
  }
}
