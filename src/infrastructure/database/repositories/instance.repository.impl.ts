import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowInstance } from '../../../domain/entities/workflow-instance.entity';
import type { InstanceRepository } from '../../../domain/repositories/instance.repository';
import { WorkflowInstancePersistence } from '../entities/workflow-instance.persistence';

@Injectable()
export class InstanceRepositoryImpl implements InstanceRepository {
  constructor(
    @InjectRepository(WorkflowInstancePersistence)
    private readonly repo: Repository<WorkflowInstancePersistence>,
  ) {}

  async findById(
    id: string,
    companyId: string,
  ): Promise<WorkflowInstance | null> {
    const row = await this.repo.findOne({
      where: { id, company_id: companyId },
    });
    return row ? this.toDomain(row) : null;
  }

  async list(
    companyId: string,
    filters?: { status?: string },
  ): Promise<WorkflowInstance[]> {
    const where: { company_id: string; status?: string } = {
      company_id: companyId,
    };
    if (filters?.status) {
      where.status = filters.status;
    }
    const rows = await this.repo.find({
      where,
      order: { created_at: 'DESC' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async save(instance: WorkflowInstance): Promise<WorkflowInstance> {
    const row = this.toPersistence(instance);
    const saved = await this.repo.save(row);
    return this.toDomain(saved);
  }

  private toDomain(row: WorkflowInstancePersistence): WorkflowInstance {
    return new WorkflowInstance(
      row.id,
      row.company_id,
      row.template_version_id,
      row.snapshot,
      row.status as 'draft' | 'pending' | 'approved' | 'rejected',
      row.submitted_at,
      row.created_at,
    );
  }

  private toPersistence(
    instance: WorkflowInstance,
  ): WorkflowInstancePersistence {
    const p = new WorkflowInstancePersistence();
    p.id = instance.id;
    p.company_id = instance.companyId;
    p.template_version_id = instance.templateVersionId;
    p.snapshot = instance.snapshot;
    p.status = instance.status;
    p.submitted_at = instance.submittedAt;
    p.created_at = instance.createdAt;
    return p;
  }
}
