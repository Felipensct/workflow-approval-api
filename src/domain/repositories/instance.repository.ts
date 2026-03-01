import type { WorkflowInstance } from '../entities/workflow-instance.entity';

/**
 * Port para persistência de instâncias de workflow.
 */
export interface InstanceRepository {
  findById(id: string, companyId: string): Promise<WorkflowInstance | null>;
  list(companyId: string, filters?: { status?: string }): Promise<WorkflowInstance[]>;
  save(instance: WorkflowInstance): Promise<WorkflowInstance>;
}
