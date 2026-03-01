import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTemplateVersionsTable1730280100003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE template_versions (
        id uuid PRIMARY KEY,
        template_id uuid NOT NULL REFERENCES templates(id),
        version_number integer NOT NULL,
        status varchar NOT NULL DEFAULT 'draft',
        definition jsonb NOT NULL,
        published_at timestamptz,
        created_at timestamptz DEFAULT NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS template_versions`);
  }
}
