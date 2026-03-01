/**
 * Configuração de SLA para um step (horas até o prazo).
 */
export interface SlaConfig {
  readonly slaHours: number;
}

export function createSlaConfig(slaHours: number, defaultHours: number): SlaConfig {
  const hours = slaHours > 0 ? slaHours : defaultHours;
  return { slaHours: hours };
}
