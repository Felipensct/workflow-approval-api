import 'dotenv/config';
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

/** UUIDs fixos para seed idempotente e referência em testes e2e e integração. */
const SEED_COMPANY_ID = 'a0000000-0000-4000-8000-000000000001';
const SEED_TEMPLATE_ID = 'a0000000-0000-4000-8000-000000000002';
const SEED_VERSION_ID = 'a0000000-0000-4000-8000-000000000003';
const SEED_INSTANCE_ID = 'a0000000-0000-4000-8000-000000000004';
const SEED_STEP_GERENTE_ID = 'a0000000-0000-4000-8000-000000000031';
const SEED_STEP_DIRETOR_ID = 'a0000000-0000-4000-8000-000000000032';
const SEED_USER_APROVADOR_1 = 'a0000000-0000-4000-8000-000000000011';
const SEED_USER_APROVADOR_2 = 'a0000000-0000-4000-8000-000000000012';
const SEED_USER_SOLICITANTE = 'a0000000-0000-4000-8000-000000000013';
const SEED_ORG_MEMBER_1 = 'a0000000-0000-4000-8000-000000000021';
const SEED_ORG_MEMBER_2 = 'a0000000-0000-4000-8000-000000000022';
const SEED_ORG_MEMBER_3 = 'a0000000-0000-4000-8000-000000000023';

async function runSeed(): Promise<void> {
  await dataSource.initialize();

  const now = new Date().toISOString();

  await dataSource.query(
    `INSERT INTO companies (id, name, created_at) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
    [SEED_COMPANY_ID, 'Empresa Demo', now],
  );

  await dataSource.query(
    `INSERT INTO org_chart_members (id, company_id, user_id, name, email, department, role, manager_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, $8) ON CONFLICT (id) DO NOTHING`,
    [SEED_ORG_MEMBER_1, SEED_COMPANY_ID, SEED_USER_APROVADOR_1, 'Aprovador Um', 'aprovador1@demo.com', 'TI', 'Gerente', now],
  );
  await dataSource.query(
    `INSERT INTO org_chart_members (id, company_id, user_id, name, email, department, role, manager_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, $8) ON CONFLICT (id) DO NOTHING`,
    [SEED_ORG_MEMBER_2, SEED_COMPANY_ID, SEED_USER_APROVADOR_2, 'Aprovador Dois', 'aprovador2@demo.com', 'TI', 'Diretor', now],
  );
  await dataSource.query(
    `INSERT INTO org_chart_members (id, company_id, user_id, name, email, department, role, manager_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, $8) ON CONFLICT (id) DO NOTHING`,
    [SEED_ORG_MEMBER_3, SEED_COMPANY_ID, SEED_USER_SOLICITANTE, 'Solicitante', 'solicitante@demo.com', 'TI', 'Analista', now],
  );

  await dataSource.query(
    `INSERT INTO templates (id, company_id, name, description, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
    [SEED_TEMPLATE_ID, SEED_COMPANY_ID, 'Aprovação simples', 'Template para testes e2e', now],
  );

  const definition = {
    steps: [
      { step_ref: 'gerente', rule: 'ANY', approvers: [SEED_USER_APROVADOR_1], sla_hours: 24 },
      { step_ref: 'diretor', rule: 'ANY', approvers: [SEED_USER_APROVADOR_2], sla_hours: 48 },
    ],
  };
  await dataSource.query(
    `INSERT INTO template_versions (id, template_id, version_number, status, definition, published_at, created_at)
     VALUES ($1, $2, 1, 'published', $3::jsonb, $4, $5) ON CONFLICT (id) DO NOTHING`,
    [SEED_VERSION_ID, SEED_TEMPLATE_ID, JSON.stringify(definition), now, now],
  );

  const snapshot = {
    template_version: { id: SEED_VERSION_ID, version_number: 1, definition },
    resolved_flow: [
      { step_ref: 'gerente', order_index: 0, rule: 'ANY', quorum_count: null, sla_hours: 24 },
      { step_ref: 'diretor', order_index: 1, rule: 'ANY', quorum_count: null, sla_hours: 48 },
    ],
    resolved_approvers: { gerente: [SEED_USER_APROVADOR_1], diretor: [SEED_USER_APROVADOR_2] },
    org_context: [
      { user_id: SEED_USER_APROVADOR_1, name: 'Aprovador Um', email: 'aprovador1@demo.com', department: 'TI', role: 'Gerente' },
      { user_id: SEED_USER_APROVADOR_2, name: 'Aprovador Dois', email: 'aprovador2@demo.com', department: 'TI', role: 'Diretor' },
    ],
  };
  await dataSource.query(
    `INSERT INTO workflow_instances (id, company_id, template_version_id, snapshot, status, submitted_at, created_at)
     VALUES ($1, $2, $3, $4::jsonb, 'pending', $5, $6) ON CONFLICT (id) DO NOTHING`,
    [SEED_INSTANCE_ID, SEED_COMPANY_ID, SEED_VERSION_ID, JSON.stringify(snapshot), now, now],
  );
  await dataSource.query(
    `INSERT INTO instance_steps (id, instance_id, step_ref, order_index, rule, quorum_count, status, sla_hours, sla_deadline, sla_breached, resolved_at, created_at)
     VALUES ($1, $2, 'gerente', 0, 'ANY', NULL, 'pending', 24, NULL, false, NULL, $3) ON CONFLICT (id) DO NOTHING`,
    [SEED_STEP_GERENTE_ID, SEED_INSTANCE_ID, now],
  );
  await dataSource.query(
    `INSERT INTO instance_steps (id, instance_id, step_ref, order_index, rule, quorum_count, status, sla_hours, sla_deadline, sla_breached, resolved_at, created_at)
     VALUES ($1, $2, 'diretor', 1, 'ANY', NULL, 'pending', 48, NULL, false, NULL, $3) ON CONFLICT (id) DO NOTHING`,
    [SEED_STEP_DIRETOR_ID, SEED_INSTANCE_ID, now],
  );

  await dataSource.destroy();
  console.log('Seed concluído: 1 company, 3 org_chart_members, 1 template, 1 versão publicada, 1 instância submetida (2 steps).');
}

runSeed().catch((err) => {
  console.error('Erro no seed:', err);
  process.exit(1);
});
