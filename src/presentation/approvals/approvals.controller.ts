import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { TenantContext } from '../tenant/tenant-context';
import { GetInboxUseCase } from '../../application/approvals/get-inbox.usecase';
import { ApproveStepUseCase } from '../../application/approvals/approve-step.usecase';
import { RejectStepUseCase } from '../../application/approvals/reject-step.usecase';

@Controller('approvals')
export class ApprovalsController {
  constructor(
    private readonly tenant: TenantContext,
    private readonly getInbox: GetInboxUseCase,
    private readonly approveStep: ApproveStepUseCase,
    private readonly rejectStep: RejectStepUseCase,
  ) {}

  @Get('inbox')
  async inbox(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const result = await this.getInbox.execute({
      companyId: this.tenant.companyId,
      userId: this.tenant.userId,
      page,
      limit,
    });
    return {
      items: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Post('instances/:instanceId/steps/:stepId/approve')
  async approve(
    @Param('instanceId', ParseUUIDPipe) instanceId: string,
    @Param('stepId', ParseUUIDPipe) stepId: string,
  ) {
    try {
      await this.approveStep.execute({
        companyId: this.tenant.companyId,
        userId: this.tenant.userId,
        instanceId,
        stepId,
      });
      return { ok: true };
    } catch (err) {
      if (err instanceof Error && err.message === 'Step não encontrado') {
        throw new NotFoundException(err.message);
      }
      if (err instanceof Error && err.message === 'Step não pertence à instância') {
        throw new NotFoundException(err.message);
      }
      if (err instanceof Error && err.message === 'Instância não encontrada') {
        throw new NotFoundException(err.message);
      }
      if (err instanceof Error && err.message === 'Usuário não é aprovador nem delegado') {
        throw new ForbiddenException(err.message);
      }
      throw err;
    }
  }

  @Post('instances/:instanceId/steps/:stepId/reject')
  async reject(
    @Param('instanceId', ParseUUIDPipe) instanceId: string,
    @Param('stepId', ParseUUIDPipe) stepId: string,
  ) {
    try {
      await this.rejectStep.execute({
        companyId: this.tenant.companyId,
        userId: this.tenant.userId,
        instanceId,
        stepId,
      });
      return { ok: true };
    } catch (err) {
      if (err instanceof Error && err.message === 'Step não encontrado') {
        throw new NotFoundException(err.message);
      }
      if (err instanceof Error && err.message === 'Step não pertence à instância') {
        throw new NotFoundException(err.message);
      }
      if (err instanceof Error && err.message === 'Instância não encontrada') {
        throw new NotFoundException(err.message);
      }
      if (err instanceof Error && err.message === 'Usuário não é aprovador nem delegado') {
        throw new ForbiddenException(err.message);
      }
      throw err;
    }
  }
}
