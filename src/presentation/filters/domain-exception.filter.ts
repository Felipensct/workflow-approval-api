import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { DelegationCycleException } from '../../domain/exceptions/delegation-cycle.exception';
import { DelegationExpiredException } from '../../domain/exceptions/delegation-expired.exception';
import { StepAlreadyResolvedException } from '../../domain/exceptions/step-already-resolved.exception';
import { VersionNotPublishedException } from '../../domain/exceptions/version-not-published.exception';
import { DuplicateVoteException } from '../../domain/exceptions/duplicate-vote.exception';

type DomainException =
  | DelegationCycleException
  | DelegationExpiredException
  | StepAlreadyResolvedException
  | VersionNotPublishedException
  | DuplicateVoteException;

const STATUS_MAP: Record<string, number> = {
  DELEGATION_CYCLE_DETECTED: HttpStatus.UNPROCESSABLE_ENTITY, // 422
  DELEGATION_EXPIRED: HttpStatus.UNPROCESSABLE_ENTITY, // 422
  STEP_ALREADY_RESOLVED: HttpStatus.CONFLICT, // 409
  VERSION_NOT_PUBLISHED: HttpStatus.UNPROCESSABLE_ENTITY, // 422
  DUPLICATE_VOTE: HttpStatus.CONFLICT, // 409
};

@Catch(
  DelegationCycleException,
  DelegationExpiredException,
  StepAlreadyResolvedException,
  VersionNotPublishedException,
  DuplicateVoteException,
)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: DomainException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const code = 'code' in exception ? exception.code : 'DOMAIN_ERROR';
    const statusCode = STATUS_MAP[code] ?? HttpStatus.UNPROCESSABLE_ENTITY;
    const message = exception.message || 'Erro de domínio';

    this.logger.warn(`Domain exception: ${code} - ${message}`);

    response.status(statusCode).json({
      error: code,
      message,
      statusCode,
    });
  }
}
