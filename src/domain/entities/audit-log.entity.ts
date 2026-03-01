/**
 * Registro imutável de auditoria.
 * Apenas INSERT; nunca UPDATE ou DELETE.
 */
export class AuditLog {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly action: string,
    public readonly actorId: string,
    public readonly payload: Record<string, unknown> | null,
    public readonly createdAt: Date,
  ) {}
}
