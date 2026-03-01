/**
 * Snapshot imutável gravado no submit da instância.
 * Contém os 4 campos obrigatórios: template_version, resolved_flow, resolved_approvers, org_context.
 */
export interface SnapshotTemplateVersion {
  id: string;
  version_number: number;
  definition: Record<string, unknown>;
}

export interface SnapshotResolvedFlowStep {
  step_ref: string;
  order_index: number;
  rule: 'ALL' | 'ANY' | 'QUORUM';
  quorum_count: number | null;
  sla_hours: number;
}

export interface SnapshotOrgContextMember {
  user_id: string;
  name: string;
  email: string;
  department: string;
  role: string;
}

export interface Snapshot {
  template_version: SnapshotTemplateVersion;
  resolved_flow: SnapshotResolvedFlowStep[];
  resolved_approvers: Record<string, string[]>;
  org_context: SnapshotOrgContextMember[];
}

export function createSnapshot(
  templateVersion: SnapshotTemplateVersion,
  resolvedFlow: SnapshotResolvedFlowStep[],
  resolvedApprovers: Record<string, string[]>,
  orgContext: SnapshotOrgContextMember[],
): Snapshot {
  return {
    template_version: templateVersion,
    resolved_flow: [...resolvedFlow],
    resolved_approvers: { ...resolvedApprovers },
    org_context: [...orgContext],
  };
}
