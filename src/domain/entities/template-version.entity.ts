/**
 * Versão de um template de workflow.
 * Status: draft | published.
 */
export class TemplateVersion {
  constructor(
    public readonly id: string,
    public readonly templateId: string,
    public readonly versionNumber: number,
    public status: 'draft' | 'published',
    public readonly definition: Record<string, unknown>,
    public publishedAt: Date | null,
    public readonly createdAt: Date,
  ) {}

  isPublished(): boolean {
    return this.status === 'published';
  }
}
