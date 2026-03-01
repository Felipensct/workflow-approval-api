import { Injectable, Inject } from '@nestjs/common';
import type { WorkflowInstance } from '../../domain/entities/workflow-instance.entity';
import type { InstanceRepository } from '../../domain/repositories/instance.repository';
import { INSTANCE_REPOSITORY } from './repository.tokens';

@Injectable()
export class GetInstanceUseCase {
  constructor(
    @Inject(INSTANCE_REPOSITORY)
    private readonly instanceRepository: InstanceRepository,
  ) {}

  async execute(
    companyId: string,
    instanceId: string,
  ): Promise<WorkflowInstance | null> {
    return this.instanceRepository.findById(instanceId, companyId);
  }
}
