/**
 * Lançada quando a criação de uma delegação formaria um ciclo no grafo
 * (ex.: A -> B -> C -> A).
 */
export class DelegationCycleException extends Error {
  readonly code = 'DELEGATION_CYCLE_DETECTED';

  constructor(message = 'Delegação formaria ciclo no grafo de delegados') {
    super(message);
    this.name = 'DelegationCycleException';
    Object.setPrototypeOf(this, DelegationCycleException.prototype);
  }
}
