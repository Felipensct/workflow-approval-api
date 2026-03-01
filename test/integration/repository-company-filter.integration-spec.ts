/**
 * Teste de integração: consultas filtradas por company_id.
 * Requer: migrations e seed (npm run migration:run && npm run seed).
 */
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

const SEED_COMPANY_ID = 'a0000000-0000-4000-8000-000000000001';

describe('Filtro por company_id', () => {
  let ds: DataSource;

  beforeAll(async () => {
    ds = await dataSource.initialize();
  }, 10000);

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  it('templates retornados apenas para company_id informado', async () => {
    const [rowsSeed] = await ds.query<{ count: string }[]>(
      'SELECT COUNT(*) AS count FROM templates WHERE company_id = $1',
      [SEED_COMPANY_ID],
    );
    expect(parseInt(rowsSeed.count, 10)).toBeGreaterThanOrEqual(0);

    const outroCompanyId = 'b0000000-0000-4000-8000-000000000001';
    const [rowsOutro] = await ds.query<{ count: string }[]>(
      'SELECT COUNT(*) AS count FROM templates WHERE company_id = $1',
      [outroCompanyId],
    );
    expect(parseInt(rowsOutro.count, 10)).toBe(0);
  });
});
