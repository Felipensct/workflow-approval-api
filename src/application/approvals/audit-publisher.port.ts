/**
 * Port para publicar eventos de auditoria (fila).
 * O processor que grava em audit_logs é implementado na Etapa 10.
 */
export interface AuditEvent {
  companyId: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  payload?: Record<string, unknown>;
}

export interface AuditPublisherPort {
  publish(event: AuditEvent): Promise<void>;
}
