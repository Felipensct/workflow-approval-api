import type { InstanceStep } from '../entities/instance-step.entity';
import type { StepVote } from '../entities/step-vote.entity';

/**
 * Port para persistência de steps e votos de instâncias.
 */
export interface StepRepository {
  findById(stepId: string, companyId: string): Promise<InstanceStep | null>;
  findByInstanceId(instanceId: string, companyId: string): Promise<InstanceStep[]>;
  saveStep(step: InstanceStep): Promise<InstanceStep>;
  saveVote(vote: StepVote): Promise<StepVote>;
  findVoteByStepAndApprover(stepId: string, approverId: string): Promise<StepVote | null>;
  findVotesByStepId(stepId: string): Promise<StepVote[]>;
}
