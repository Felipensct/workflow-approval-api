/**
 * Serviço de domínio para cálculo de SLA e detecção de estouro.
 */
export class SlaService {
  /**
   * Calcula o deadline (data/hora limite) a partir do momento de referência e das horas de SLA.
   */
  calculateDeadline(from: Date, slaHours: number): Date {
    const deadline = new Date(from.getTime());
    deadline.setHours(deadline.getHours() + slaHours);
    return deadline;
  }

  /**
   * Verifica se o SLA estourou (now >= deadline).
   */
  isBreached(deadline: Date, now: Date): boolean {
    return now.getTime() >= deadline.getTime();
  }
}
