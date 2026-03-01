import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('org_chart_members')
export class OrgChartMemberPersistence {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  company_id: string;

  @Column('uuid')
  user_id: string;

  @Column('varchar')
  name: string;

  @Column('varchar')
  email: string;

  @Column('varchar')
  department: string;

  @Column('varchar')
  role: string;

  @Column('uuid', { nullable: true })
  manager_id: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
