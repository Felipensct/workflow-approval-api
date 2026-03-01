import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('templates')
export class TemplatePersistence {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  company_id: string;

  @Column('varchar')
  name: string;

  @Column('text', { nullable: true })
  description: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
