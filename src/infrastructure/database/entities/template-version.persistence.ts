import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('template_versions')
export class TemplateVersionPersistence {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  template_id: string;

  @Column('int')
  version_number: number;

  @Column('varchar', { default: 'draft' })
  status: string;

  @Column('jsonb')
  definition: Record<string, unknown>;

  @Column({ type: 'timestamptz', nullable: true })
  published_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
