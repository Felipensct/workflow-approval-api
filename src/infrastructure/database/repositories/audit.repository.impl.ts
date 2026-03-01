import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../../domain/entities/audit-log.entity';
import type { AuditRepository } from '../../../domain/repositories/audit.repository';
import { AuditLogPersistence } from '../entities/audit-log.persistence';

@Injectable()
export class AuditRepositoryImpl implements AuditRepository {
  constructor(
    @InjectRepository(AuditLogPersistence)
    private readonly repo: Repository<AuditLogPersistence>,
  ) {}

  async create(log: AuditLog): Promise<AuditLog> {
    const row = this.toPersistence(log);
    const saved = await this.repo.save(row);
    return this.toDomain(saved);
  }

  private toDomain(row: AuditLogPersistence): AuditLog {
    return new AuditLog(
      row.id,
      row.company_id,
      row.entity_type,
      row.entity_id,
      row.action,
      row.actor_id,
      row.payload,
      row.created_at,
    );
  }

  private toPersistence(log: AuditLog): AuditLogPersistence {
    const p = new AuditLogPersistence();
    p.id = log.id;
    p.company_id = log.companyId;
    p.entity_type = log.entityType;
    p.entity_id = log.entityId;
    p.action = log.action;
    p.actor_id = log.actorId;
    p.payload = log.payload;
    p.created_at = log.createdAt;
    return p;
  }
}
