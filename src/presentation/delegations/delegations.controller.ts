import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import { TenantContext } from '../tenant/tenant-context';
import { CreateDelegationUseCase } from '../../application/delegations/create-delegation.usecase';
import { ListDelegationsUseCase } from '../../application/delegations/list-delegations.usecase';
import { ListActiveDelegationsUseCase } from '../../application/delegations/list-active-delegations.usecase';
import { DeleteDelegationUseCase } from '../../application/delegations/delete-delegation.usecase';
import { CreateDelegationDto } from './dtos/create-delegation.dto';

@Controller('delegations')
export class DelegationsController {
  constructor(
    private readonly tenant: TenantContext,
    private readonly createDelegation: CreateDelegationUseCase,
    private readonly listDelegations: ListDelegationsUseCase,
    private readonly listActiveDelegations: ListActiveDelegationsUseCase,
    private readonly deleteDelegation: DeleteDelegationUseCase,
  ) {}

  @Post()
  async create(@Body() dto: CreateDelegationDto) {
    const delegation = await this.createDelegation.execute({
      companyId: this.tenant.companyId,
      delegatorId: this.tenant.userId,
      delegateId: dto.delegate_id,
      expiresAt: new Date(dto.expires_at),
    });
    return this.toDelegationResponse(delegation);
  }

  @Get()
  async list() {
    const delegations = await this.listDelegations.execute(this.tenant.companyId);
    return delegations.map((d) => this.toDelegationResponse(d));
  }

  @Get('active')
  async listActive() {
    const delegations = await this.listActiveDelegations.execute(
      this.tenant.companyId,
    );
    return delegations.map((d) => this.toDelegationResponse(d));
  }

  @Delete(':id')
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    try {
      await this.deleteDelegation.execute(id, this.tenant.companyId);
    } catch (err) {
      if (err instanceof Error && err.message === 'Delegação não encontrada') {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }

  private toDelegationResponse(d: {
    id: string;
    companyId: string;
    delegatorId: string;
    delegateId: string;
    expiresAt: Date;
    createdAt: Date;
  }) {
    return {
      id: d.id,
      company_id: d.companyId,
      delegator_id: d.delegatorId,
      delegate_id: d.delegateId,
      expires_at: d.expiresAt.toISOString(),
      created_at: d.createdAt.toISOString(),
    };
  }
}
