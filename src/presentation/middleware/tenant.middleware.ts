import { Request, Response, NextFunction } from 'express';

const SKIP_PATHS = ['/health', '/health/ready'];

function getHeader(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length > 0) return value[0];
  return undefined;
}

/**
 * Middleware que rejeita com 400 qualquer requisição (exceto /health e /health/ready)
 * sem os headers X-Company-ID e X-User-ID. Roda antes do roteamento, então aplica
 * inclusive a paths que não existem (ex.: GET /v1/templates sem headers → 400).
 */
export function tenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const path = req.path;
  if (SKIP_PATHS.some((p) => path === p || path.startsWith(p + '?'))) {
    return next();
  }

  const companyId = getHeader(req, 'x-company-id');
  const userId = getHeader(req, 'x-user-id');

  if (!companyId || companyId.trim() === '') {
    res.status(400).json({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Header X-Company-ID é obrigatório',
    });
    return;
  }
  if (!userId || userId.trim() === '') {
    res.status(400).json({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Header X-User-ID é obrigatório',
    });
    return;
  }

  next();
}
