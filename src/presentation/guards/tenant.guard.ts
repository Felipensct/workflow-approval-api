import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Guard que exige os headers X-Company-ID e X-User-ID.
 * A validação global (qualquer requisição → 400 sem headers) é feita por tenant.middleware.ts.
 * Este guard permanece disponível para uso em rotas específicas, se necessário.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  private static readonly SKIP_PATHS = ['/health', '/health/ready'];

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const path = request.path;

    if (TenantGuard.SKIP_PATHS.some((p) => path === p || path.startsWith(p + '?'))) {
      return true;
    }

    const companyId = this.getHeader(request, 'x-company-id');
    const userId = this.getHeader(request, 'x-user-id');

    if (!companyId || companyId.trim() === '') {
      throw new BadRequestException('Header X-Company-ID é obrigatório');
    }
    if (!userId || userId.trim() === '') {
      throw new BadRequestException('Header X-User-ID é obrigatório');
    }

    return true;
  }

  private getHeader(request: Request, name: string): string | undefined {
    const value = request.headers[name];
    if (typeof value === 'string') return value;
    if (Array.isArray(value) && value.length > 0) return value[0];
    return undefined;
  }
}
