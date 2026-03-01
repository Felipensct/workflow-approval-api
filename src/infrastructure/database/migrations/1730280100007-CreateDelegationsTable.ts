import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDelegationsTable1730280100007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE delegations (
        id uuid PRIMARY KEY,
        company_id uuid NOT NULL REFERENCES companies(id),
        delegator_id uuid NOT NULL,
        delegate_id uuid NOT NULL,
        expires_at timestamptz NOT NULL,
        created_at timestamptz DEFAULT NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS delegations`);
  }
}
