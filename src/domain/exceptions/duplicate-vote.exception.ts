/**
 * Lançada quando o mesmo aprovador tenta votar duas vezes no mesmo step
 * (caso a idempotência não tenha sido aplicada antes).
 */
export class DuplicateVoteException extends Error {
  readonly code = 'DUPLICATE_VOTE';

  constructor(message = 'Aprovador já votou neste step') {
    super(message);
    this.name = 'DuplicateVoteException';
    Object.setPrototypeOf(this, DuplicateVoteException.prototype);
  }
}
