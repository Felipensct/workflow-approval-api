import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

/**
 * Contexto de tenant por requisição (REQUEST-scoped).
 * Expõe company_id e user_id extraídos dos headers, já validados pelo TenantGuard.
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantContext {
  constructor(
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  get companyId(): string {
    const value = this.request.headers['x-company-id'];
    return Array.isArray(value) ? value[0] : (value ?? '');
  }

  get userId(): string {
    const value = this.request.headers['x-user-id'];
    return Array.isArray(value) ? value[0] : (value ?? '');
  }
}
