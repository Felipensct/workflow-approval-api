import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Delegation } from '../../../domain/entities/delegation.entity';
import type { DelegationRepository } from '../../../domain/repositories/delegation.repository';
import { DelegationPersistence } from '../entities/delegation.persistence';

@Injectable()
export class DelegationRepositoryImpl implements DelegationRepository {
  constructor(
    @InjectRepository(DelegationPersistence)
    private readonly repo: Repository<DelegationPersistence>,
  ) {}

  async findById(id: string, companyId: string): Promise<Delegation | null> {
    const row = await this.repo.findOne({
      where: { id, company_id: companyId },
    });
    return row ? this.toDomain(row) : null;
  }

  async list(companyId: string): Promise<Delegation[]> {
    const rows = await this.repo.find({
      where: { company_id: companyId },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async listActive(companyId: string, at: Date): Promise<Delegation[]> {
    const rows = await this.repo
      .createQueryBuilder('d')
      .where('d.company_id = :companyId', { companyId })
      .andWhere('d.expires_at > :at', { at: at.toISOString() })
      .getMany();
    return rows.map((r) => this.toDomain(r));
  }

  async findActiveByDelegatorAndDelegate(
    companyId: string,
    delegatorId: string,
    delegateId: string,
    at: Date,
  ): Promise<Delegation | null> {
    const row = await this.repo.findOne({
      where: {
        company_id: companyId,
        delegator_id: delegatorId,
        delegate_id: delegateId,
      },
    });
    if (!row || row.expires_at <= at) return null;
    return this.toDomain(row);
  }

  async save(delegation: Delegation): Promise<Delegation> {
    const row = this.toPersistence(delegation);
    const saved = await this.repo.save(row);
    return this.toDomain(saved);
  }

  async delete(id: string, companyId: string): Promise<void> {
    await this.repo.delete({ id, company_id: companyId });
  }

  private toDomain(row: DelegationPersistence): Delegation {
    return new Delegation(
      row.id,
      row.company_id,
      row.delegator_id,
      row.delegate_id,
      row.expires_at,
      row.created_at,
    );
  }

  private toPersistence(delegation: Delegation): DelegationPersistence {
    const p = new DelegationPersistence();
    p.id = delegation.id;
    p.company_id = delegation.companyId;
    p.delegator_id = delegation.delegatorId;
    p.delegate_id = delegation.delegateId;
    p.expires_at = delegation.expiresAt;
    p.created_at = delegation.createdAt;
    return p;
  }
}
