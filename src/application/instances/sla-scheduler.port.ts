/**
 * Port para agendamento de jobs de SLA (delay até verificação de estouro).
 * Implementação em infrastructure usa BullMQ.
 */
export interface SlaSchedulerPort {
  schedule(stepId: string, delayMs: number): Promise<void>;
}
