import { Injectable, Inject } from '@nestjs/common';
import type { WorkflowInstance } from '../../domain/entities/workflow-instance.entity';
import type { InstanceStep } from '../../domain/entities/instance-step.entity';
import type { InstanceRepository } from '../../domain/repositories/instance.repository';
import type { StepRepository } from '../../domain/repositories/step.repository';
import { INSTANCE_REPOSITORY, STEP_REPOSITORY } from './repository.tokens';

export interface TimelineResult {
  instance: WorkflowInstance;
  steps: InstanceStep[];
}

@Injectable()
export class GetTimelineUseCase {
  constructor(
    @Inject(INSTANCE_REPOSITORY)
    private readonly instanceRepository: InstanceRepository,
    @Inject(STEP_REPOSITORY)
    private readonly stepRepository: StepRepository,
  ) {}

  async execute(
    companyId: string,
    instanceId: string,
  ): Promise<TimelineResult | null> {
    const instance = await this.instanceRepository.findById(
      instanceId,
      companyId,
    );
    if (!instance) return null;
    const steps = await this.stepRepository.findByInstanceId(
      instanceId,
      companyId,
    );
    return { instance, steps };
  }
}
