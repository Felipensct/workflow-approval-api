import { DataSource } from 'typeorm';
import { join } from 'path';

const isCompiled = __dirname.includes('dist');
const migrationsDir = join(__dirname, 'migrations');
const migrationsPattern = isCompiled ? '*.js' : '*.ts';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'incicle',
  migrations: [join(migrationsDir, migrationsPattern)],
  migrationsTableName: 'migrations',
  synchronize: false,
});
