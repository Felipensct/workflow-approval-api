/**
 * Lançada quando uma aprovação é tentada usando delegação já expirada.
 */
export class DelegationExpiredException extends Error {
  readonly code = 'DELEGATION_EXPIRED';

  constructor(message = 'Delegação expirada não pode ser usada') {
    super(message);
    this.name = 'DelegationExpiredException';
    Object.setPrototypeOf(this, DelegationExpiredException.prototype);
  }
}
