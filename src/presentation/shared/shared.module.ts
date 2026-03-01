import { Global, Module } from '@nestjs/common';
import { TenantContext } from '../tenant/tenant-context';

/**
 * Módulo compartilhado: contexto de tenant REQUEST-scoped.
 * Validação de headers (X-Company-ID, X-User-ID) é feita pelo tenantMiddleware em main.ts.
 */
@Global()
@Module({
  providers: [TenantContext],
  exports: [TenantContext],
})
export class SharedModule {}
