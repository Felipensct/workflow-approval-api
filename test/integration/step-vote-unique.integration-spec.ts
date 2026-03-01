/**
 * Teste de integração: constraint UNIQUE(step_id, approver_id) em step_votes.
 * Requer: migrations rodadas, seed rodado, e ao menos uma instância submetida (com steps).
 * Execute com: npm run test:integration
 * (Com docker compose up e npm run seed; depois crie uma instância e submeta via API ou seed-load.)
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'incicle',
  synchronize: false,
});

describe('step_votes UNIQUE(step_id, approver_id)', () => {
  let ds: DataSource;
  let stepId: string;
  const approverId = randomUUID();

  beforeAll(async () => {
    ds = await dataSource.initialize();
    const steps = await ds.query<{ id: string }[]>(
      'SELECT id FROM instance_steps LIMIT 1',
    );
    if (steps.length === 0) {
      throw new Error(
        'Nenhum instance_step encontrado. Rode o seed e submeta uma instância antes dos testes de integração.',
      );
    }
    stepId = steps[0].id;
  }, 30000);

  afterAll(async () => {
    if (ds?.isInitialized) {
      await ds.query('DELETE FROM step_votes WHERE step_id = $1 AND approver_id = $2', [
        stepId,
        approverId,
      ]);
      await ds.destroy();
    }
  });

  it('rejeita segundo insert com mesmo (step_id, approver_id)', async () => {
    const voteId1 = randomUUID();
    const voteId2 = randomUUID();
    await ds.query(
      `INSERT INTO step_votes (id, step_id, approver_id, decision, voted_at)
       VALUES ($1, $2, $3, 'approve', NOW())`,
      [voteId1, stepId, approverId],
    );

    await expect(
      ds.query(
        `INSERT INTO step_votes (id, step_id, approver_id, decision, voted_at)
         VALUES ($1, $2, $3, 'approve', NOW())`,
        [voteId2, stepId, approverId],
      ),
    ).rejects.toThrow(/uq_step_approver|unique|duplicate/i);

    await ds.query('DELETE FROM step_votes WHERE id = $1', [voteId1]);
  });
});
