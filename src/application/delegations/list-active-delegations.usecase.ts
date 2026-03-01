import { Inject, Injectable } from '@nestjs/common';
import type { Delegation } from '../../domain/entities/delegation.entity';
import type { DelegationRepository } from '../../domain/repositories/delegation.repository';
import { DELEGATION_REPOSITORY } from './repository.tokens';

@Injectable()
export class ListActiveDelegationsUseCase {
  constructor(
    @Inject(DELEGATION_REPOSITORY)
    private readonly delegationRepository: DelegationRepository,
  ) {}

  async execute(companyId: string, at: Date = new Date()): Promise<Delegation[]> {
    return this.delegationRepository.listActive(companyId, at);
  }
}
