import { DelegationCycleService } from '../../src/domain/services/delegation-cycle.service';

describe('DelegationCycleService', () => {
  let service: DelegationCycleService;

  beforeEach(() => {
    service = new DelegationCycleService();
  });

  it('retorna false quando não há arestas (grafo vazio)', () => {
    expect(service.wouldCreateCycle([], 'A', 'B')).toBe(false);
  });

  it('detecta ciclo direto A -> B -> A', () => {
    const edges = [{ delegatorId: 'A', delegateId: 'B' }];
    expect(service.wouldCreateCycle(edges, 'B', 'A')).toBe(true);
  });

  it('não forma ciclo quando nova aresta é B -> C (grafo A -> B)', () => {
    const edges = [{ delegatorId: 'A', delegateId: 'B' }];
    expect(service.wouldCreateCycle(edges, 'B', 'C')).toBe(false);
  });

  it('detecta ciclo indireto A -> B -> C -> A', () => {
    const edges = [
      { delegatorId: 'A', delegateId: 'B' },
      { delegatorId: 'B', delegateId: 'C' },
    ];
    expect(service.wouldCreateCycle(edges, 'C', 'A')).toBe(true);
  });

  it('detecta ciclo de um nó para si mesmo A -> A', () => {
    expect(service.wouldCreateCycle([], 'A', 'A')).toBe(true);
  });

  it('não forma ciclo quando não há caminho de volta', () => {
    const edges = [
      { delegatorId: 'A', delegateId: 'B' },
      { delegatorId: 'B', delegateId: 'C' },
    ];
    expect(service.wouldCreateCycle(edges, 'X', 'Y')).toBe(false);
    expect(service.wouldCreateCycle(edges, 'C', 'X')).toBe(false);
  });
});
