import type { Delegation } from '../entities/delegation.entity';

/**
 * Port para persistência de delegações.
 */
export interface DelegationRepository {
  findById(id: string, companyId: string): Promise<Delegation | null>;
  list(companyId: string): Promise<Delegation[]>;
  listActive(companyId: string, at: Date): Promise<Delegation[]>;
  findActiveByDelegatorAndDelegate(
    companyId: string,
    delegatorId: string,
    delegateId: string,
    at: Date,
  ): Promise<Delegation | null>;
  save(delegation: Delegation): Promise<Delegation>;
  delete(id: string, companyId: string): Promise<void>;
}
