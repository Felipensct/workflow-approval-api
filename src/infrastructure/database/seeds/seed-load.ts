/**
 * Seed de carga: 2 empresas, ~100 usuários por empresa, 10.000 workflow_instances.
 * Distribuição: 40% pending, 30% approved, 20% rejected, 10% draft.
 * Execução: npm run seed:load (requer migrations e .env).
 */
import 'dotenv/config';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'incicle',
  synchronize: false,
});

const NUM_ORG_MEMBERS_PER_COMPANY = 100;
const TOTAL_INSTANCES = 10_000;
const DRAFT_PCT = 0.1;
const PENDING_PCT = 0.4;
const APPROVED_PCT = 0.3;
const REJECTED_PCT = 0.2;
const BATCH_SIZE = 500;

const COMPANY_1 = 'c1000000-0000-4000-8000-000000000001';
const COMPANY_2 = 'c2000000-0000-4000-8000-000000000002';

/** Gera UUID determinístico: prefix8 deve ter 8 caracteres (ex: "c1000000"). */
function uuidFromSeed(prefix8: string, n: number): string {
  const hex = n.toString(16).padStart(12, '0');
  return `${prefix8.slice(0, 8)}-0000-4000-8000-${hex}`;
}

async function runSeedLoad(): Promise<void> {
  await dataSource.initialize();
  const now = new Date().toISOString();

  console.log('Criando empresas...');
  await dataSource.query(
    `INSERT INTO companies (id, name, created_at) VALUES ($1, $2, $3), ($4, $5, $6) ON CONFLICT (id) DO NOTHING`,
    [COMPANY_1, 'Empresa Load 1', now, COMPANY_2, 'Empresa Load 2', now],
  );

  const templateId1 = randomUUID();
  const templateId2 = randomUUID();
  const versionId1 = randomUUID();
  const versionId2 = randomUUID();

  const definition = {
    steps: [
      { step_ref: 'gerente', rule: 'ANY', approvers: [] as string[], sla_hours: 24 },
      { step_ref: 'diretor', rule: 'ANY', approvers: [] as string[], sla_hours: 48 },
    ],
  };

  for (const [companyId, companyName, tId, vId] of [
    [COMPANY_1, 'Empresa Load 1', templateId1, versionId1] as const,
    [COMPANY_2, 'Empresa Load 2', templateId2, versionId2] as const,
  ]) {
    console.log(`Inserindo org_chart e template para ${companyId}...`);
    const userIds: string[] = [];
    const orgMemberIds: string[] = [];
    const prefix8 = companyId.slice(0, 8);
    const orgPrefix8 = 'a' + companyId.slice(1, 8);
    for (let i = 0; i < NUM_ORG_MEMBERS_PER_COMPANY; i++) {
      userIds.push(uuidFromSeed(prefix8, i + 1));
      orgMemberIds.push(uuidFromSeed(orgPrefix8, i + 1));
    }

    for (let i = 0; i < NUM_ORG_MEMBERS_PER_COMPANY; i++) {
      await dataSource.query(
        `INSERT INTO org_chart_members (id, company_id, user_id, name, email, department, role, manager_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, $8) ON CONFLICT (id) DO NOTHING`,
        [
          orgMemberIds[i],
          companyId,
          userIds[i],
          `User ${i + 1}`,
          `user${i + 1}@load.com`,
          'TI',
          i < 2 ? (i === 0 ? 'Gerente' : 'Diretor') : 'Analista',
          now,
        ],
      );
    }

    const defWithApprovers = {
      ...definition,
      steps: [
        { ...definition.steps[0], approvers: [userIds[0]] },
        { ...definition.steps[1], approvers: [userIds[1]] },
      ],
    };

    await dataSource.query(
      `INSERT INTO templates (id, company_id, name, description, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
      [tId, companyId, 'Template Load', 'Para testes de carga', now],
    );
    await dataSource.query(
      `INSERT INTO template_versions (id, template_id, version_number, status, definition, published_at, created_at)
       VALUES ($1, $2, 1, 'published', $3::jsonb, $4, $5) ON CONFLICT (id) DO NOTHING`,
      [vId, tId, JSON.stringify(defWithApprovers), now, now],
    );
  }

  const versionId1Final = versionId1;
  const versionId2Final = versionId2;

  const nDraft = Math.round(TOTAL_INSTANCES * DRAFT_PCT);
  const nPending = Math.round(TOTAL_INSTANCES * PENDING_PCT);
  const nApproved = Math.round(TOTAL_INSTANCES * APPROVED_PCT);
  const nRejected = Math.round(TOTAL_INSTANCES * REJECTED_PCT);

  const draftSnapshot = {
    template_version: { id: versionId1Final, version_number: 1, definition: {} },
    resolved_flow: [],
    resolved_approvers: {},
    org_context: [],
  };

  const companies = [COMPANY_1, COMPANY_2];
  const versionIds = [versionId1Final, versionId2Final];

  const instances: { id: string; company_id: string; template_version_id: string; status: string; snapshot: object; submitted_at: string | null }[] = [];
  const steps: { id: string; instance_id: string; step_ref: string; order_index: number; rule: string; quorum_count: number | null; status: string; sla_hours: number; resolved_at: string | null }[] = [];
  const votes: { id: string; step_id: string; approver_id: string; decision: string }[] = [];

  const user0Company1 = uuidFromSeed(COMPANY_1, 1);
  const user1Company1 = uuidFromSeed(COMPANY_1, 2);
  const user0Company2 = uuidFromSeed(COMPANY_2, 1);
  const user1Company2 = uuidFromSeed(COMPANY_2, 2);

  for (let i = 0; i < TOTAL_INSTANCES; i++) {
    const companyIdx = i % 2;
    const companyId = companies[companyIdx];
    const versionId = versionIds[companyIdx];
    const user0 = companyIdx === 0 ? user0Company1 : user0Company2;
    const user1 = companyIdx === 0 ? user1Company1 : user1Company2;

    let status: string;
    if (i < nDraft) status = 'draft';
    else if (i < nDraft + nPending) status = 'pending';
    else if (i < nDraft + nPending + nApproved) status = 'approved';
    else status = 'rejected';

    const instanceId = randomUUID();
    const submittedAt = status === 'draft' ? null : now;

    const snapshot =
      status === 'draft'
        ? draftSnapshot
        : {
            template_version: { id: versionId, version_number: 1, definition: { steps: [] } },
            resolved_flow: [
              { step_ref: 'gerente', order_index: 0, rule: 'ANY', quorum_count: null, sla_hours: 24 },
              { step_ref: 'diretor', order_index: 1, rule: 'ANY', quorum_count: null, sla_hours: 48 },
            ],
            resolved_approvers: { gerente: [user0], diretor: [user1] },
            org_context: [
              { user_id: user0, name: 'User 1', email: 'u1@load.com', department: 'TI', role: 'Gerente' },
              { user_id: user1, name: 'User 2', email: 'u2@load.com', department: 'TI', role: 'Diretor' },
            ],
          };

    instances.push({
      id: instanceId,
      company_id: companyId,
      template_version_id: versionId,
      status,
      snapshot,
      submitted_at: submittedAt,
    });

    if (status !== 'draft') {
      const stepId1 = randomUUID();
      const stepId2 = randomUUID();
      const step1Resolved = status !== 'pending';
      const step2Resolved = status !== 'pending';
      steps.push({
        id: stepId1,
        instance_id: instanceId,
        step_ref: 'gerente',
        order_index: 0,
        rule: 'ANY',
        quorum_count: null,
        status: status === 'pending' ? 'pending' : status === 'rejected' ? 'rejected' : 'approved',
        sla_hours: 24,
        resolved_at: step1Resolved ? now : null,
      });
      steps.push({
        id: stepId2,
        instance_id: instanceId,
        step_ref: 'diretor',
        order_index: 1,
        rule: 'ANY',
        quorum_count: null,
        status: status === 'pending' ? 'pending' : status === 'rejected' ? 'rejected' : 'approved',
        sla_hours: 48,
        resolved_at: step2Resolved ? now : null,
      });

      if (status === 'approved') {
        votes.push({ id: randomUUID(), step_id: stepId1, approver_id: user0, decision: 'approve' });
        votes.push({ id: randomUUID(), step_id: stepId2, approver_id: user1, decision: 'approve' });
      } else if (status === 'rejected') {
        votes.push({ id: randomUUID(), step_id: stepId1, approver_id: user0, decision: 'reject' });
      }
    }
  }

  console.log('Inserindo workflow_instances em lotes...');
  for (let b = 0; b < instances.length; b += BATCH_SIZE) {
    const batch = instances.slice(b, b + BATCH_SIZE);
    const values = batch
      .map(
        (r, i) =>
          `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}::jsonb, $${i * 6 + 5}, $${i * 6 + 6})`,
      )
      .join(', ');
    const params = batch.flatMap((r) => [
      r.id,
      r.company_id,
      r.template_version_id,
      JSON.stringify(r.snapshot),
      r.status,
      r.submitted_at,
    ]);
    await dataSource.query(
      `INSERT INTO workflow_instances (id, company_id, template_version_id, snapshot, status, submitted_at) VALUES ${values} ON CONFLICT (id) DO NOTHING`,
      params,
    );
    if ((b + BATCH_SIZE) % 2000 === 0 || b + BATCH_SIZE >= instances.length) {
      console.log(`  ${Math.min(b + BATCH_SIZE, instances.length)} / ${instances.length} instances`);
    }
  }

  console.log('Inserindo instance_steps em lotes...');
  const stepCols = 11;
  for (let b = 0; b < steps.length; b += BATCH_SIZE * 2) {
    const batch = steps.slice(b, b + BATCH_SIZE * 2);
    const placeholders = batch
      .map((_, i) => `(${Array.from({ length: stepCols }, (_, k) => `$${i * stepCols + k + 1}`).join(', ')})`)
      .join(', ');
    const params = batch.flatMap((r) => [
      r.id,
      r.instance_id,
      r.step_ref,
      r.order_index,
      r.rule,
      r.quorum_count,
      r.status,
      r.sla_hours,
      null,
      false,
      r.resolved_at,
    ]);
    await dataSource.query(
      `INSERT INTO instance_steps (id, instance_id, step_ref, order_index, rule, quorum_count, status, sla_hours, sla_deadline, sla_breached, resolved_at) VALUES ${placeholders} ON CONFLICT (id) DO NOTHING`,
      params,
    );
    if ((b + batch.length) % 2000 === 0 || b + batch.length >= steps.length) {
      console.log(`  ${Math.min(b + batch.length, steps.length)} / ${steps.length} steps`);
    }
  }

  console.log('Inserindo step_votes em lotes...');
  for (let b = 0; b < votes.length; b += BATCH_SIZE * 2) {
    const batch = votes.slice(b, b + BATCH_SIZE * 2);
    const values = batch
      .map((r, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`)
      .join(', ');
    const params = batch.flatMap((r) => [r.id, r.step_id, r.approver_id, r.decision]);
    await dataSource.query(
      `INSERT INTO step_votes (id, step_id, approver_id, decision) VALUES ${values} ON CONFLICT (step_id, approver_id) DO NOTHING`,
      params,
    );
    if ((b + batch.length) % 2000 === 0 || b + batch.length >= votes.length) {
      console.log(`  ${Math.min(b + batch.length, votes.length)} / ${votes.length} votes`);
    }
  }

  await dataSource.destroy();
  console.log(
    `Seed de carga concluído: 2 empresas, ${NUM_ORG_MEMBERS_PER_COMPANY * 2} org_chart_members, ${TOTAL_INSTANCES} instâncias (draft: ${nDraft}, pending: ${nPending}, approved: ${nApproved}, rejected: ${nRejected}).`,
  );
}

runSeedLoad().catch((err) => {
  console.error('Erro no seed de carga:', err);
  process.exit(1);
});
