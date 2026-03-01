import { AppDataSource } from './data-source';

export async function runMigrations(): Promise<void> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  await AppDataSource.runMigrations();
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
}
