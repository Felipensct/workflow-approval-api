import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTemplatesTable1730280100002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE templates (
        id uuid PRIMARY KEY,
        company_id uuid NOT NULL REFERENCES companies(id),
        name varchar NOT NULL,
        description text,
        created_at timestamptz DEFAULT NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS templates`);
  }
}
