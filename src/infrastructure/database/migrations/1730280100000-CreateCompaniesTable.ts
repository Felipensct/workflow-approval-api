import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCompaniesTable1730280100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE companies (
        id uuid PRIMARY KEY,
        name varchar NOT NULL,
        created_at timestamptz DEFAULT NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS companies`);
  }
}
