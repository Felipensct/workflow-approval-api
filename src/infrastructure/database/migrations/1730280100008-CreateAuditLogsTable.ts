import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogsTable1730280100008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id uuid PRIMARY KEY,
        company_id uuid NOT NULL,
        entity_type varchar NOT NULL,
        entity_id uuid NOT NULL,
        action varchar NOT NULL,
        actor_id uuid NOT NULL,
        payload jsonb,
        created_at timestamptz DEFAULT NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs`);
  }
}
