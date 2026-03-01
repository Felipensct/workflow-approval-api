import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import type { Snapshot } from '../../../domain/value-objects/snapshot.vo';

@Entity('workflow_instances')
export class WorkflowInstancePersistence {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  company_id: string;

  @Column('uuid')
  template_version_id: string;

  @Column('jsonb')
  snapshot: Snapshot;

  @Column('varchar', { default: 'draft' })
  status: string;

  @Column({ type: 'timestamptz', nullable: true })
  submitted_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
