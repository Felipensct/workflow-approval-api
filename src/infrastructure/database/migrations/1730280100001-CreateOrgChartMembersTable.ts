import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrgChartMembersTable1730280100001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE org_chart_members (
        id uuid PRIMARY KEY,
        company_id uuid NOT NULL REFERENCES companies(id),
        user_id uuid NOT NULL,
        name varchar NOT NULL,
        email varchar NOT NULL,
        department varchar NOT NULL,
        role varchar NOT NULL,
        manager_id uuid REFERENCES org_chart_members(id),
        created_at timestamptz DEFAULT NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS org_chart_members`);
  }
}
