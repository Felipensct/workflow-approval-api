/**
 * Serviço de domínio para detecção de ciclo no grafo de delegações.
 * Executa DFS: ao adicionar delegator -> delegate, verifica se existe caminho
 * de delegate de volta para delegator (ciclo).
 */
export class DelegationCycleService {
  /**
   * Verifica se a adição da aresta (delegatorId -> delegateId) ao grafo
   * formado pelas delegações ativas criaria um ciclo.
   * @param edges Lista de arestas ativas [delegatorId, delegateId][]
   * @param newDelegatorId Quem está delegando
   * @param newDelegateId Para quem está delegando
   * @returns true se formaria ciclo (ex.: A->B, B->C e nova C->A)
   */
  wouldCreateCycle(
    edges: Array<{ delegatorId: string; delegateId: string }>,
    newDelegatorId: string,
    newDelegateId: string,
  ): boolean {
    const graph = new Map<string, string[]>();
    for (const { delegatorId, delegateId } of edges) {
      const list = graph.get(delegatorId) ?? [];
      list.push(delegateId);
      graph.set(delegatorId, list);
    }
    const newList = graph.get(newDelegatorId) ?? [];
    newList.push(newDelegateId);
    graph.set(newDelegatorId, newList);

    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const visit = (node: string): boolean => {
      visited.add(node);
      recursionStack.add(node);
      const neighbours = graph.get(node) ?? [];
      for (const next of neighbours) {
        if (!visited.has(next)) {
          if (visit(next)) return true;
        } else if (recursionStack.has(next)) {
          return true;
        }
      }
      recursionStack.delete(node);
      return false;
    };

    return visit(newDelegatorId);
  }
}
