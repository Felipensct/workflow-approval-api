/**
 * Lançada quando se tenta aprovar/rejeitar um step que já foi resolvido.
 */
export class StepAlreadyResolvedException extends Error {
  readonly code = 'STEP_ALREADY_RESOLVED';

  constructor(message = 'Step já foi aprovado ou rejeitado') {
    super(message);
    this.name = 'StepAlreadyResolvedException';
    Object.setPrototypeOf(this, StepAlreadyResolvedException.prototype);
  }
}
