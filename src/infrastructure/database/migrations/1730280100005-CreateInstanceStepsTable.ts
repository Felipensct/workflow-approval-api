import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInstanceStepsTable1730280100005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE instance_steps (
        id uuid PRIMARY KEY,
        instance_id uuid NOT NULL REFERENCES workflow_instances(id),
        step_ref varchar NOT NULL,
        order_index integer NOT NULL,
        rule varchar NOT NULL,
        quorum_count integer,
        status varchar NOT NULL DEFAULT 'pending',
        sla_hours integer NOT NULL,
        sla_deadline timestamptz,
        sla_breached boolean DEFAULT false,
        resolved_at timestamptz,
        created_at timestamptz DEFAULT NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS instance_steps`);
  }
}
