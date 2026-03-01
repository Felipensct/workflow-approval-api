import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWorkflowInstancesTable1730280100004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE workflow_instances (
        id uuid PRIMARY KEY,
        company_id uuid NOT NULL REFERENCES companies(id),
        template_version_id uuid NOT NULL REFERENCES template_versions(id),
        snapshot jsonb NOT NULL,
        status varchar NOT NULL DEFAULT 'draft',
        submitted_at timestamptz,
        created_at timestamptz DEFAULT NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS workflow_instances`);
  }
}
