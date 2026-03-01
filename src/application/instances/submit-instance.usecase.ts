import { Injectable, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { VersionNotPublishedException } from '../../domain/exceptions/version-not-published.exception';
import { WorkflowInstance } from '../../domain/entities/workflow-instance.entity';
import type { InstanceRepository } from '../../domain/repositories/instance.repository';
import type { StepRepository } from '../../domain/repositories/step.repository';
import type { TemplateVersionRepository } from '../../domain/repositories/template-version.repository';
import type { OrgChartRepository } from '../../domain/repositories/org-chart.repository';
import type { SlaSchedulerPort } from './sla-scheduler.port';
import type { AuditPublisherPort } from '../approvals/audit-publisher.port';
import { SlaService } from '../../domain/services/sla.service';
import {
  INSTANCE_REPOSITORY,
  STEP_REPOSITORY,
  ORG_CHART_REPOSITORY,
  SLA_SCHEDULER,
} from './repository.tokens';
import { AUDIT_PUBLISHER_PORT } from '../approvals/tokens';
import { TEMPLATE_VERSION_REPOSITORY } from '../templates/repository.tokens';
import {
  createSnapshot,
  type SnapshotResolvedFlowStep,
  type SnapshotOrgContextMember,
} from '../../domain/value-objects/snapshot.vo';
import { isApprovalRuleType } from '../../domain/value-objects/approval-rule.vo';
import { InstanceStep } from '../../domain/entities/instance-step.entity';

interface DefinitionStep {
  step_ref: string;
  rule: string;
  approvers: string[];
  sla_hours?: number;
}

interface TemplateDefinition {
  steps?: DefinitionStep[];
}

export interface SubmitInstanceInput {
  companyId: string;
  userId: string;
  instanceId: string;
  defaultSlaHours: number;
}

@Injectable()
export class SubmitInstanceUseCase {
  private readonly slaService = new SlaService();

  constructor(
    @Inject(INSTANCE_REPOSITORY)
    private readonly instanceRepository: InstanceRepository,
    @Inject(STEP_REPOSITORY)
    private readonly stepRepository: StepRepository,
    @Inject(TEMPLATE_VERSION_REPOSITORY)
    private readonly versionRepository: TemplateVersionRepository,
    @Inject(ORG_CHART_REPOSITORY)
    private readonly orgChartRepository: OrgChartRepository,
    @Inject(SLA_SCHEDULER)
    private readonly slaScheduler: SlaSchedulerPort,
    @Inject(AUDIT_PUBLISHER_PORT)
    private readonly auditPublisher: AuditPublisherPort,
  ) {}

  async execute(input: SubmitInstanceInput): Promise<WorkflowInstance> {
    const instance = await this.instanceRepository.findById(
      input.instanceId,
      input.companyId,
    );
    if (!instance) {
      throw new Error('Instância não encontrada');
    }
    if (instance.status !== 'draft') {
      throw new Error('Instância já foi submetida');
    }

    const version = await this.versionRepository.findById(
      instance.templateVersionId,
      input.companyId,
    );
    if (!version) {
      throw new Error('Versão do template não encontrada');
    }
    if (!version.isPublished()) {
      throw new VersionNotPublishedException();
    }

    const definition = version.definition as TemplateDefinition;
    const stepsDef = definition?.steps ?? [];
    if (stepsDef.length === 0) {
      throw new Error('Definição do template não possui steps');
    }

    const members = await this.orgChartRepository.listByCompanyId(
      input.companyId,
    );
    const membersByUserId = new Map(members.map((m) => [m.userId, m]));

    const resolvedFlow: SnapshotResolvedFlowStep[] = [];
    const resolvedApprovers: Record<string, string[]> = {};
    const orgContextMap = new Map<string, SnapshotOrgContextMember>();

    for (let i = 0; i < stepsDef.length; i++) {
      const s = stepsDef[i];
      const rule = isApprovalRuleType(s.rule) ? s.rule : 'ANY';
      const approverIds = s.approvers ?? [];
      const slaHours =
        s.sla_hours && s.sla_hours > 0
          ? s.sla_hours
          : input.defaultSlaHours;
      const quorumCount = rule === 'QUORUM' ? approverIds.length : null;

      resolvedFlow.push({
        step_ref: s.step_ref,
        order_index: i,
        rule,
        quorum_count: quorumCount,
        sla_hours: slaHours,
      });
      resolvedApprovers[s.step_ref] = [...approverIds];

      for (const uid of approverIds) {
        if (orgContextMap.has(uid)) continue;
        const m = membersByUserId.get(uid);
        if (m) {
          orgContextMap.set(uid, {
            user_id: m.userId,
            name: m.name,
            email: m.email,
            department: m.department,
            role: m.role,
          });
        }
      }
    }

    const snapshot = createSnapshot(
      {
        id: version.id,
        version_number: version.versionNumber,
        definition: version.definition,
      },
      resolvedFlow,
      resolvedApprovers,
      Array.from(orgContextMap.values()),
    );

    const submittedAt = new Date();
    const updatedInstance = new WorkflowInstance(
      instance.id,
      instance.companyId,
      instance.templateVersionId,
      snapshot,
      'pending',
      submittedAt,
      instance.createdAt,
    );
    await this.instanceRepository.save(updatedInstance);

    for (let i = 0; i < resolvedFlow.length; i++) {
      const stepDef = resolvedFlow[i];
      const slaHours = stepDef.sla_hours;
      const deadline = this.slaService.calculateDeadline(submittedAt, slaHours);
      const stepId = randomUUID();
      const instanceStep = new InstanceStep(
        stepId,
        instance.id,
        stepDef.step_ref,
        stepDef.order_index,
        stepDef.rule as 'ALL' | 'ANY' | 'QUORUM',
        stepDef.quorum_count,
        'pending',
        slaHours,
        deadline,
        false,
        null,
        submittedAt,
      );
      await this.stepRepository.saveStep(instanceStep);
      await this.slaScheduler.schedule(
        stepId,
        slaHours * 3600 * 1000,
      );
    }

    await this.auditPublisher.publish({
      companyId: input.companyId,
      entityType: 'workflow_instance',
      entityId: updatedInstance.id,
      action: 'INSTANCE_SUBMITTED',
      actorId: input.userId,
      payload: { template_version_id: instance.templateVersionId },
    });

    return updatedInstance;
  }
}
