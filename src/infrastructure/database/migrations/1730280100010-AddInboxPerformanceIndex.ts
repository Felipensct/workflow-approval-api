import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Índice para otimizar a query do inbox: filtra steps por status e join por instance_id.
 */
export class AddInboxPerformanceIndex1730280100010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX idx_steps_status_instance_id ON instance_steps(status, instance_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_steps_status_instance_id`,
    );
  }
}
