import type { Snapshot } from '../value-objects/snapshot.vo';

/**
 * Instância de workflow (aprovação).
 * Status: draft | pending | approved | rejected.
 */
export class WorkflowInstance {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly templateVersionId: string,
    public readonly snapshot: Snapshot,
    public status: 'draft' | 'pending' | 'approved' | 'rejected',
    public submittedAt: Date | null,
    public readonly createdAt: Date,
  ) {}
}
