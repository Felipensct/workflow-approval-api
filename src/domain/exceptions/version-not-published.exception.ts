/**
 * Lançada quando se tenta submeter uma instância cuja versão do template não está publicada.
 */
export class VersionNotPublishedException extends Error {
  readonly code = 'VERSION_NOT_PUBLISHED';

  constructor(message = 'Versão do template não está publicada') {
    super(message);
    this.name = 'VersionNotPublishedException';
    Object.setPrototypeOf(this, VersionNotPublishedException.prototype);
  }
}
