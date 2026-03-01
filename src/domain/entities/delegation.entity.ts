/**
 * Delegação de poder de aprovação de um usuário para outro.
 */
export class Delegation {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly delegatorId: string,
    public readonly delegateId: string,
    public readonly expiresAt: Date,
    public readonly createdAt: Date,
  ) {}

  isActive(at: Date): boolean {
    return at < this.expiresAt;
  }
}
