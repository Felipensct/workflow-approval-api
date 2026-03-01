import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStepVotesTable1730280100006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE step_votes (
        id uuid PRIMARY KEY,
        step_id uuid NOT NULL REFERENCES instance_steps(id),
        approver_id uuid NOT NULL,
        decision varchar NOT NULL,
        delegated_by uuid,
        voted_at timestamptz DEFAULT NOW(),
        CONSTRAINT uq_step_approver UNIQUE (step_id, approver_id)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS step_votes`);
  }
}
