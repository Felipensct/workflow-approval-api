/**
 * Identificador de empresa (multi-tenancy).
 * Value object para garantir formato UUID em operações de domínio.
 */
export class CompanyId {
  private constructor(public readonly value: string) {}

  static create(value: string): CompanyId {
    if (!value || value.trim() === '') {
      throw new Error('CompanyId não pode ser vazio');
    }
    return new CompanyId(value.trim());
  }

  equals(other: CompanyId): boolean {
    return this.value === other.value;
  }
}
