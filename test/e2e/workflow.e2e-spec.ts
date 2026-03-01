/**
 * E2E: 8 cenários do plano (submit, idempotência, concorrência, delegação, ciclo, expirada, snapshot imutável, health).
 * Requer: PostgreSQL e Redis rodando (ex.: docker compose up -d), migrations e seed (npm run migration:run && npm run seed).
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe, ServiceUnavailableException } from '@nestjs/common';
import { VersioningType } from '@nestjs/common';
import { HealthCheckService } from '@nestjs/terminus';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { StepVotePersistence } from '../../src/infrastructure/database/entities/step-vote.persistence';
import { HealthModule } from '../../src/presentation/health/health.module';
import { runMigrations } from '../../src/infrastructure/database/run-migrations';
import { tenantMiddleware } from '../../src/presentation/middleware/tenant.middleware';
import { DomainExceptionFilter } from '../../src/presentation/filters/domain-exception.filter';

const COMPANY_ID = 'a0000000-0000-4000-8000-000000000001';
const USER_APROVADOR_1 = 'a0000000-0000-4000-8000-000000000011';
const USER_APROVADOR_2 = 'a0000000-0000-4000-8000-000000000012';
const USER_SOLICITANTE = 'a0000000-0000-4000-8000-000000000013';
const TEMPLATE_VERSION_ID = 'a0000000-0000-4000-8000-000000000003';

function tenantHeaders(companyId = COMPANY_ID, userId = USER_SOLICITANTE) {
  return {
    'X-Company-ID': companyId,
    'X-User-ID': userId,
  };
}

describe('Workflow E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    await runMigrations();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.use(tenantMiddleware);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.enableVersioning({
      type: VersioningType.URI,
      prefix: 'v',
      defaultVersion: '1',
    });
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
  }, 60000);

  afterAll(async () => {
    await app?.close();
  });

  describe('1. Submit com snapshot (4 campos)', () => {
    it('retorna instância com snapshot contendo template_version, resolved_flow, resolved_approvers, org_context', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/v1/instances')
        .set(tenantHeaders())
        .set('Content-Type', 'application/json')
        .send({ template_version_id: TEMPLATE_VERSION_ID })
        .expect(201);
      const instanceId = createRes.body.id;

      const submitRes = await request(app.getHttpServer())
        .post(`/v1/instances/${instanceId}/submit`)
        .set(tenantHeaders())
        .expect(201);

      expect(submitRes.body.snapshot).toHaveProperty('template_version');
      expect(submitRes.body.snapshot).toHaveProperty('resolved_flow');
      expect(submitRes.body.snapshot).toHaveProperty('resolved_approvers');
      expect(submitRes.body.snapshot).toHaveProperty('org_context');
      expect(submitRes.body.status).toBe('pending');
    });
  });

  describe('2. Aprovação idempotente', () => {
    it('mesma requisição approve 2x resulta em um único voto', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/v1/instances')
        .set(tenantHeaders())
        .set('Content-Type', 'application/json')
        .send({ template_version_id: TEMPLATE_VERSION_ID })
        .expect(201);
      const submitRes = await request(app.getHttpServer())
        .post(`/v1/instances/${createRes.body.id}/submit`)
        .set(tenantHeaders())
        .expect(201);
      const timelineRes = await request(app.getHttpServer())
        .get(`/v1/instances/${createRes.body.id}/timeline`)
        .set(tenantHeaders())
        .expect(200);
      const stepId = timelineRes.body.steps[0].id;

      await request(app.getHttpServer())
        .post(`/v1/approvals/instances/${createRes.body.id}/steps/${stepId}/approve`)
        .set(tenantHeaders(COMPANY_ID, USER_APROVADOR_1))
        .expect(201);
      await request(app.getHttpServer())
        .post(`/v1/approvals/instances/${createRes.body.id}/steps/${stepId}/approve`)
        .set(tenantHeaders(COMPANY_ID, USER_APROVADOR_1))
        .expect(201);

      const dataSource = app.get(DataSource);
      const voteCount = await dataSource
        .getRepository(StepVotePersistence)
        .count({ where: { step_id: stepId } });
      expect(voteCount).toBe(1);

      const timelineAfter = await request(app.getHttpServer())
        .get(`/v1/instances/${createRes.body.id}/timeline`)
        .set(tenantHeaders())
        .expect(200);
      const firstStep = timelineAfter.body.steps[0];
      expect(firstStep.status).toBe('approved');
    });
  });

  describe('3. Corrida concorrente (N=20, 1 voto efetivo)', () => {
    it('20 requests paralelas de approve no mesmo step ANY resultam em 1 voto', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/v1/instances')
        .set(tenantHeaders())
        .set('Content-Type', 'application/json')
        .send({ template_version_id: TEMPLATE_VERSION_ID })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/v1/instances/${createRes.body.id}/submit`)
        .set(tenantHeaders())
        .expect(201);
      const timelineRes = await request(app.getHttpServer())
        .get(`/v1/instances/${createRes.body.id}/timeline`)
        .set(tenantHeaders())
        .expect(200);
      const stepId = timelineRes.body.steps[0].id;

      const n = 20;
      const results = await Promise.allSettled(
        Array.from({ length: n }, () =>
          request(app.getHttpServer())
            .post(`/v1/approvals/instances/${createRes.body.id}/steps/${stepId}/approve`)
            .set(tenantHeaders(COMPANY_ID, USER_APROVADOR_1)),
        ),
      );

      const okCount = results.filter(
        (r) => r.status === 'fulfilled' && (r.value.status === 201 || r.value.status === 200),
      ).length;
      expect(okCount).toBeGreaterThanOrEqual(1);

      const dataSource = app.get(DataSource);
      const voteCount = await dataSource
        .getRepository(StepVotePersistence)
        .count({ where: { step_id: stepId } });
      expect(voteCount).toBe(1);

      const timelineAfter = await request(app.getHttpServer())
        .get(`/v1/instances/${createRes.body.id}/timeline`)
        .set(tenantHeaders())
        .expect(200);
      expect(timelineAfter.body.steps[0].status).toBe('approved');
    });
  });

  describe('4. Delegação ativa (delegado aprova, delegated_by preenchido)', () => {
    it('delegado aprova no lugar do delegador e voto registra delegated_by', async () => {
      const expiresAt = new Date(Date.now() + 86400000).toISOString();
      await request(app.getHttpServer())
        .post('/v1/delegations')
        .set(tenantHeaders(COMPANY_ID, USER_APROVADOR_1))
        .set('Content-Type', 'application/json')
        .send({ delegate_id: USER_APROVADOR_2, expires_at: expiresAt })
        .expect(201);

      const createRes = await request(app.getHttpServer())
        .post('/v1/instances')
        .set(tenantHeaders())
        .set('Content-Type', 'application/json')
        .send({ template_version_id: TEMPLATE_VERSION_ID })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/v1/instances/${createRes.body.id}/submit`)
        .set(tenantHeaders())
        .expect(201);
      const timelineRes = await request(app.getHttpServer())
        .get(`/v1/instances/${createRes.body.id}/timeline`)
        .set(tenantHeaders())
        .expect(200);
      const stepId = timelineRes.body.steps[0].id;

      await request(app.getHttpServer())
        .post(`/v1/approvals/instances/${createRes.body.id}/steps/${stepId}/approve`)
        .set(tenantHeaders(COMPANY_ID, USER_APROVADOR_2))
        .expect(201);

      const dataSource = app.get(DataSource);
      const vote = await dataSource
        .getRepository(StepVotePersistence)
        .findOne({ where: { step_id: stepId } });
      expect(vote).not.toBeNull();
      expect(vote!.delegated_by).toBe(USER_APROVADOR_2);

      const timelineAfter = await request(app.getHttpServer())
        .get(`/v1/instances/${createRes.body.id}/timeline`)
        .set(tenantHeaders())
        .expect(200);
      expect(timelineAfter.body.steps[0].status).toBe('approved');
    });
  });

  describe('5. Ciclo de delegação', () => {
    it('retorna 422 DELEGATION_CYCLE_DETECTED ao criar A->B, B->C, C->A', async () => {
      const companyId = COMPANY_ID;
      const userA = 'b0000000-0000-4000-8000-000000000001';
      const userB = 'b0000000-0000-4000-8000-000000000002';
      const userC = 'b0000000-0000-4000-8000-000000000003';
      const expiresAt = new Date(Date.now() + 86400000).toISOString();

      await request(app.getHttpServer())
        .post('/v1/delegations')
        .set({ 'X-Company-ID': companyId, 'X-User-ID': userA })
        .set('Content-Type', 'application/json')
        .send({ delegate_id: userB, expires_at: expiresAt })
        .expect(201);
      await request(app.getHttpServer())
        .post('/v1/delegations')
        .set({ 'X-Company-ID': companyId, 'X-User-ID': userB })
        .set('Content-Type', 'application/json')
        .send({ delegate_id: userC, expires_at: expiresAt })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/v1/delegations')
        .set({ 'X-Company-ID': companyId, 'X-User-ID': userC })
        .set('Content-Type', 'application/json')
        .send({ delegate_id: userA, expires_at: expiresAt });
      expect(res.status).toBe(422);
      expect(res.body.error).toBe('DELEGATION_CYCLE_DETECTED');
    });
  });

  describe('6. Delegação expirada', () => {
    it('retorna 422 DELEGATION_EXPIRED ao aprovar como delegado com delegação expirada', async () => {
      const USER_EXPIRADO = 'a0000000-0000-4000-8000-000000000099';
      const expiresAt = new Date(Date.now() - 1000).toISOString();
      await request(app.getHttpServer())
        .post('/v1/delegations')
        .set(tenantHeaders(COMPANY_ID, USER_APROVADOR_1))
        .set('Content-Type', 'application/json')
        .send({ delegate_id: USER_EXPIRADO, expires_at: expiresAt })
        .expect(201);

      const createRes = await request(app.getHttpServer())
        .post('/v1/instances')
        .set(tenantHeaders())
        .set('Content-Type', 'application/json')
        .send({ template_version_id: TEMPLATE_VERSION_ID })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/v1/instances/${createRes.body.id}/submit`)
        .set(tenantHeaders())
        .expect(201);
      const timelineRes = await request(app.getHttpServer())
        .get(`/v1/instances/${createRes.body.id}/timeline`)
        .set(tenantHeaders())
        .expect(200);
      const stepId = timelineRes.body.steps[0].id;

      const res = await request(app.getHttpServer())
        .post(`/v1/approvals/instances/${createRes.body.id}/steps/${stepId}/approve`)
        .set(tenantHeaders(COMPANY_ID, USER_EXPIRADO));
      expect(res.status).toBe(422);
      expect(res.body.error).toBe('DELEGATION_EXPIRED');
    });
  });

  describe('7. Snapshot imutável após mudança no org chart', () => {
    it('snapshot da instância submetida não muda após alteração no org chart', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/v1/instances')
        .set(tenantHeaders())
        .set('Content-Type', 'application/json')
        .send({ template_version_id: TEMPLATE_VERSION_ID })
        .expect(201);
      const submitRes = await request(app.getHttpServer())
        .post(`/v1/instances/${createRes.body.id}/submit`)
        .set(tenantHeaders())
        .expect(201);
      const snapshotAntes = JSON.parse(JSON.stringify(submitRes.body.snapshot));

      const userIdFromSnapshot = snapshotAntes.org_context?.[0]?.user_id;
      expect(userIdFromSnapshot).toBeDefined();

      const dataSource = app.get(DataSource);
      await dataSource.query(
        `UPDATE org_chart_members SET name = $1, email = $2 WHERE user_id = $3 AND company_id = $4`,
        ['Nome Alterado No Org Chart', 'alterado@demo.com', userIdFromSnapshot, COMPANY_ID],
      );

      const getRes = await request(app.getHttpServer())
        .get(`/v1/instances/${createRes.body.id}`)
        .set(tenantHeaders())
        .expect(200);
      expect(getRes.body.snapshot).toEqual(snapshotAntes);
    });
  });

  describe('8. Health readiness e falha de dependência', () => {
    it('GET /health/ready retorna 200 quando PostgreSQL e Redis estão disponíveis', async () => {
      const res = await request(app.getHttpServer()).get('/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.info?.database?.status).toBe('up');
      expect(res.body.info?.redis?.status).toBe('up');
    });

    it('GET /health/ready retorna 503 quando Redis está indisponível (mock)', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [HealthModule],
      })
        .overrideProvider(HealthCheckService)
        .useValue({
          check: jest.fn().mockRejectedValue(
            new ServiceUnavailableException({
              status: 'error',
              info: {},
              error: { redis: { status: 'down', message: 'Unavailable' } },
              details: { redis: { status: 'down', message: 'Unavailable' } },
            }),
          ),
        })
        .compile();

      const appUnhealthy = moduleRef.createNestApplication();

      appUnhealthy.use(tenantMiddleware);
      appUnhealthy.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );
      appUnhealthy.useGlobalFilters(new DomainExceptionFilter());
      appUnhealthy.enableVersioning({
        type: VersioningType.URI,
        prefix: 'v',
        defaultVersion: '1',
      });

      await appUnhealthy.init();

      const res = await request(appUnhealthy.getHttpServer()).get('/health/ready');
      expect(res.status).toBe(503);

      await appUnhealthy.close();
    });

    it('GET /health/ready retorna 200 após dependência ser restaurada', async () => {
      const res = await request(app.getHttpServer()).get('/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });
});
