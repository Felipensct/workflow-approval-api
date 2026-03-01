import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIndexes1730280100009 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX idx_instances_company_status ON workflow_instances(company_id, status)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_steps_instance_id ON instance_steps(instance_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_votes_step_id ON step_votes(step_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_delegations_delegate_expires ON delegations(delegate_id, expires_at)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_delegations_delegator_id ON delegations(delegator_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_audit_company ON audit_logs(company_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_instances_company_status`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_steps_instance_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_votes_step_id`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_delegations_delegate_expires`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_delegations_delegator_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_entity`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_company`);
  }
}
