import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('instance_steps')
export class InstanceStepPersistence {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  instance_id: string;

  @Column('varchar')
  step_ref: string;

  @Column('int')
  order_index: number;

  @Column('varchar')
  rule: string;

  @Column('int', { nullable: true })
  quorum_count: number | null;

  @Column('varchar', { default: 'pending' })
  status: string;

  @Column('int')
  sla_hours: number;

  @Column({ type: 'timestamptz', nullable: true })
  sla_deadline: Date | null;

  @Column('boolean', { default: false })
  sla_breached: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  resolved_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
