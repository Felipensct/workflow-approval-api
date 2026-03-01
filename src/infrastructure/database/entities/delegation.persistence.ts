import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('delegations')
export class DelegationPersistence {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  company_id: string;

  @Column('uuid')
  delegator_id: string;

  @Column('uuid')
  delegate_id: string;

  @Column('timestamptz')
  expires_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
