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

/** UUIDs fixos para seed idempotente e referência em testes e2e. */
const SEED_COMPANY_ID = 'a0000000-0000-4000-8000-000000000001';
const SEED_TEMPLATE_ID = 'a0000000-0000-4000-8000-000000000002';
const SEED_VERSION_ID = 'a0000000-0000-4000-8000-000000000003';
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

  await dataSource.destroy();
  console.log('Seed concluído: 1 company, 3 org_chart_members, 1 template, 1 versão publicada.');
}

runSeed().catch((err) => {
  console.error('Erro no seed:', err);
  process.exit(1);
});
