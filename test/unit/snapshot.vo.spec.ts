import {
  createSnapshot,
  type SnapshotTemplateVersion,
  type SnapshotResolvedFlowStep,
  type SnapshotOrgContextMember,
} from '../../src/domain/value-objects/snapshot.vo';

describe('Snapshot VO', () => {
  const templateVersion: SnapshotTemplateVersion = {
    id: 'tv-1',
    version_number: 1,
    definition: { steps: [] },
  };
  const resolvedFlow: SnapshotResolvedFlowStep[] = [
    {
      step_ref: 'step1',
      order_index: 0,
      rule: 'ANY',
      quorum_count: null,
      sla_hours: 24,
    },
  ];
  const resolvedApprovers: Record<string, string[]> = {
    step1: ['user-1'],
  };
  const orgContext: SnapshotOrgContextMember[] = [
    {
      user_id: 'user-1',
      name: 'User One',
      email: 'u1@test.com',
      department: 'TI',
      role: 'Aprovador',
    },
  ];

  it('possui os 4 campos obrigatórios', () => {
    const snapshot = createSnapshot(
      templateVersion,
      resolvedFlow,
      resolvedApprovers,
      orgContext,
    );
    expect(snapshot).toHaveProperty('template_version');
    expect(snapshot).toHaveProperty('resolved_flow');
    expect(snapshot).toHaveProperty('resolved_approvers');
    expect(snapshot).toHaveProperty('org_context');
    expect(snapshot.template_version).toEqual(templateVersion);
    expect(snapshot.resolved_flow).toEqual(resolvedFlow);
    expect(snapshot.resolved_approvers).toEqual(resolvedApprovers);
    expect(snapshot.org_context).toEqual(orgContext);
  });

  it('é imutável: arrays/objetos internos são cópias', () => {
    const snapshot = createSnapshot(
      templateVersion,
      resolvedFlow,
      resolvedApprovers,
      orgContext,
    );
    expect(snapshot.resolved_flow).not.toBe(resolvedFlow);
    expect(snapshot.resolved_flow).toEqual(resolvedFlow);
    expect(snapshot.resolved_approvers).not.toBe(resolvedApprovers);
    expect(snapshot.resolved_approvers).toEqual(resolvedApprovers);
    expect(snapshot.org_context).not.toBe(orgContext);
    expect(snapshot.org_context).toEqual(orgContext);
  });

  it('mutar arrays originais após createSnapshot não altera o snapshot', () => {
    const flow = [...resolvedFlow];
    const approvers = { ...resolvedApprovers };
    const context = [...orgContext];
    const snapshot = createSnapshot(
      templateVersion,
      flow,
      approvers,
      context,
    );
    flow.push({
      step_ref: 'step2',
      order_index: 1,
      rule: 'ALL',
      quorum_count: null,
      sla_hours: 48,
    });
    approvers['step2'] = ['user-2'];
    context.push({
      user_id: 'user-2',
      name: 'User Two',
      email: 'u2@test.com',
      department: 'TI',
      role: 'Aprovador',
    });
    expect(snapshot.resolved_flow).toHaveLength(1);
    expect(Object.keys(snapshot.resolved_approvers)).toEqual(['step1']);
    expect(snapshot.org_context).toHaveLength(1);
  });
});
