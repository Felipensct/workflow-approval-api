import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLogPersistence {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  company_id: string;

  @Column('varchar')
  entity_type: string;

  @Column('uuid')
  entity_id: string;

  @Column('varchar')
  action: string;

  @Column('uuid')
  actor_id: string;

  @Column('jsonb', { nullable: true })
  payload: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
