/**
 * Template de workflow no domínio.
 * Classe pura, sem decorators de persistência.
 */
export class Template {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public name: string,
    public description: string | null,
    public readonly createdAt: Date,
  ) {}
}
