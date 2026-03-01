import type { AuditLog } from '../entities/audit-log.entity';

/**
 * Port para escrita de auditoria.
 * Apenas create(); nunca update ou delete.
 */
export interface AuditRepository {
  create(log: AuditLog): Promise<AuditLog>;
}
