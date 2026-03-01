import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TenantContext } from '../tenant/tenant-context';
import { CreateInstanceUseCase } from '../../application/instances/create-instance.usecase';
import { SubmitInstanceUseCase } from '../../application/instances/submit-instance.usecase';
import { GetInstanceUseCase } from '../../application/instances/get-instance.usecase';
import { ListInstancesUseCase } from '../../application/instances/list-instances.usecase';
import { GetTimelineUseCase } from '../../application/instances/get-timeline.usecase';
import { CreateInstanceDto } from './dtos/create-instance.dto';

@Controller('instances')
export class InstancesController {
  constructor(
    private readonly tenant: TenantContext,
    private readonly config: ConfigService,
    private readonly createInstance: CreateInstanceUseCase,
    private readonly submitInstance: SubmitInstanceUseCase,
    private readonly getInstance: GetInstanceUseCase,
    private readonly listInstances: ListInstancesUseCase,
    private readonly getTimelineUseCase: GetTimelineUseCase,
  ) {}

  @Post()
  async create(@Body() dto: CreateInstanceDto) {
    try {
      const instance = await this.createInstance.execute({
        companyId: this.tenant.companyId,
        templateVersionId: dto.template_version_id,
      });
      return this.toInstanceResponse(instance);
    } catch (err) {
      if (err instanceof Error && err.message === 'Versão do template não encontrada') {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }

  @Post(':id/submit')
  async submit(@Param('id', ParseUUIDPipe) id: string) {
    const defaultSlaHours = this.config.get<number>('SLA_DEFAULT_HOURS', 24);
    try {
      const instance = await this.submitInstance.execute({
        companyId: this.tenant.companyId,
        userId: this.tenant.userId,
        instanceId: id,
        defaultSlaHours: Number(defaultSlaHours) || 24,
      });
      return this.toInstanceResponse(instance);
    } catch (err) {
      if (err instanceof Error && err.message === 'Instância não encontrada') {
        throw new NotFoundException(err.message);
      }
      if (err instanceof Error && err.message === 'Instância já foi submetida') {
        throw new NotFoundException(err.message);
      }
      if (err instanceof Error && err.message === 'Versão do template não encontrada') {
        throw new NotFoundException(err.message);
      }
      if (err instanceof Error && err.message === 'Definição do template não possui steps') {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }

  @Get()
  async list(@Query('status') status?: string) {
    const instances = await this.listInstances.execute(this.tenant.companyId, {
      status,
    });
    return instances.map((i) => this.toInstanceResponse(i));
  }

  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const instance = await this.getInstance.execute(this.tenant.companyId, id);
    if (!instance) {
      throw new NotFoundException('Instância não encontrada');
    }
    return this.toInstanceResponse(instance);
  }

  @Get(':id/timeline')
  async getTimeline(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.getTimelineUseCase.execute(this.tenant.companyId, id);
    if (!result) {
      throw new NotFoundException('Instância não encontrada');
    }
    return {
      instance: this.toInstanceResponse(result.instance),
      steps: result.steps.map((s) => ({
        id: s.id,
        step_ref: s.stepRef,
        order_index: s.orderIndex,
        rule: s.rule,
        status: s.status,
        sla_hours: s.slaHours,
        sla_deadline: s.slaDeadline,
        sla_breached: s.slaBreached,
        resolved_at: s.resolvedAt,
        created_at: s.createdAt,
      })),
    };
  }

  private toInstanceResponse(instance: {
    id: string;
    templateVersionId: string;
    snapshot: unknown;
    status: string;
    submittedAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: instance.id,
      template_version_id: instance.templateVersionId,
      snapshot: instance.snapshot,
      status: instance.status,
      submitted_at: instance.submittedAt,
      created_at: instance.createdAt,
    };
  }
}
