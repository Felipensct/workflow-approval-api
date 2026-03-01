import {
  Entity,
  PrimaryColumn,
  Column,
} from 'typeorm';

@Entity('step_votes')
export class StepVotePersistence {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  step_id: string;

  @Column('uuid')
  approver_id: string;

  @Column('varchar')
  decision: string;

  @Column('uuid', { nullable: true })
  delegated_by: string | null;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  voted_at: Date;
}
