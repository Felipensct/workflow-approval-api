import { Injectable, Inject } from '@nestjs/common';
import type { WorkflowInstance } from '../../domain/entities/workflow-instance.entity';
import type { InstanceRepository } from '../../domain/repositories/instance.repository';
import { INSTANCE_REPOSITORY } from './repository.tokens';

export interface ListInstancesFilters {
  status?: string;
}

@Injectable()
export class ListInstancesUseCase {
  constructor(
    @Inject(INSTANCE_REPOSITORY)
    private readonly instanceRepository: InstanceRepository,
  ) {}

  async execute(
    companyId: string,
    filters?: ListInstancesFilters,
  ): Promise<WorkflowInstance[]> {
    return this.instanceRepository.list(companyId, filters);
  }
}
