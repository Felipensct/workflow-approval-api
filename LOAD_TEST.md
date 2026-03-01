# Relatório de testes de carga (k6)

Testes de carga da API Workflow InCicle usando k6, conforme plano (Etapa 15).

---

## Cenário

- **Rampa de subida:** 30s até atingir o número de VUs alvo.
- **Sustentação:** 2min com carga constante.
- **Rampa de descida:** 15s até zero VUs.

**Critérios de sucesso (thresholds):**

- `http_req_failed` &lt; 2%
- `http_req_duration` p(95) &lt; 500 ms

---

## Scripts

| Script             | Endpoint(s)                                                                 | Descrição                                      |
|--------------------|-----------------------------------------------------------------------------|------------------------------------------------|
| `inbox.test.js`    | GET `/v1/approvals/inbox?page=1&limit=20`                                   | Listagem do inbox do aprovador (leitura).      |
| `approve.test.js`  | GET inbox + POST `/v1/approvals/instances/:instanceId/steps/:stepId/approve`| Fluxo: obter item do inbox e aprovar (escrita). |
| `timeline.test.js` | GET `/v1/instances/:id/timeline`                                            | Timeline de uma instância (leitura).           |

**Pré-requisito:** rodar o seed de carga antes dos testes (`npm run seed:load`) para ter base realista (10k instâncias, steps pendentes para approve).

**Variáveis de ambiente (opcionais):**

- `BASE_URL` — URL da API (default: `http://localhost:3000`)
- `COMPANY_ID` — tenant (default: empresa 1 do seed-load)
- `USER_ID` — usuário (default: primeiro usuário da empresa 1)

**Exemplo de execução:**

```bash
# Inbox (10 VUs no pico)
k6 run load-tests/inbox.test.js

# Approve (5 VUs; consome steps pendentes)
k6 run load-tests/approve.test.js

# Timeline (10 VUs; usa IDs obtidos em setup)
k6 run load-tests/timeline.test.js
```

---

## Resultados

### Throughput (req/s)

| Script    | Iterações/s (média) | Requisições/s |
|-----------|----------------------|---------------|
| inbox     | 5,54                | 5,54         |
| approve   | 3,12                | 6,23 (2 req/iter) |
| timeline  | 17,09               | 17,10         |

### Latência

| Script    | p95 (ms) | p99 (ms) |
|-----------|----------|----------|
| inbox     | 1450     | —        |
| approve   | 989      | —        |
| timeline  | 4,62     | —        |

### Taxa de erro

| Script    | http_req_failed |
|-----------|------------------|
| inbox     | 0,00%            |
| approve   | 0,00%            |
| timeline  | 0,00%            |

### Objetivos (thresholds)

- [x] `http_req_failed` &lt; 2% em todos os scripts
- [ ] `http_req_duration` p95 &lt; 500 ms — **inbox** (p95 ≈ 1450 ms, após índice + cache Redis + limit 2000) e **approve** (p95 ≈ 989 ms) ficaram acima do threshold; **timeline** dentro do objetivo (p95 ≈ 4,6 ms)

**Nota:** No approve, várias VUs podem pegar o mesmo item do inbox (limit=1) e disputar o mesmo step; a API retorna 200 para o primeiro e 409 (voto duplicado / step já resolvido) para os demais. O script aceita 200, 404 e 409 como sucesso para o threshold.

### Justificativa técnica — p95 acima do threshold

**Inbox (p95 ≈ 1450 ms, após otimizações):**

- Índice `idx_steps_status_instance_id`, cache Redis (TTL 30s) e limit 2000 na query já implementados; p95 caiu de ~2150 ms para ~1450 ms e throughput de ~4,4 para ~5,5 req/s
- Restante da latência: query ainda faz JOIN com workflow_instances, leitura de snapshot (JSONB) para resolved_approvers e filtro por delegações ativas; volume de dados (10k instâncias, ~18k steps) mantém custo relevante

**Approve (p95 ≈ 989 ms):**

- Cada approve envolve transação com SELECT FOR UPDATE, leitura de snapshot, verificação de delegação e possível escrita de voto + atualização de step/instance
- Concorrência de 5 VUs disputando steps (muitas requisições para o mesmo step) aumenta contenção no banco e tempo de espera por lock

### Plano de mitigação

1. **Inbox:** Criar índice em instance_steps (instance_id, status) e garantir que a query use o JOIN com workflow_instances filtrando por company_id de forma indexada; implementar cache Redis (TTL 30s) para o resultado do inbox por usuário; considerar paginação com cursor para reduzir custo em páginas altas.
2. **Approve:** Reduzir contenção distribuindo itens do inbox entre VUs (ex.: page variável por VU); avaliar índice em (step_id, approver_id) para a checagem de voto duplicado; manter transação curta (evitar lógica pesada dentro do lock).
3. **Timeline:** Manter como está (já dentro do objetivo).
4. Em cenários de altíssimo volume, considerar view materializada ou tabela de inbox pré-calculada atualizada de forma assíncrona.

---

## Gargalo identificado

- **Inbox:** p95 ≈ 1450 ms (após índice, cache Redis e limit 2000); throughput ~5,5 req/s. Ainda acima do threshold por conta do volume de dados e do custo do JSONB do snapshot.
- **Approve:** p95 ≈ 989 ms; transação com lock (SELECT FOR UPDATE) e concorrência entre VUs no mesmo step geram espera. Throughput ~6,2 req/s (2 req/iter).
- **Timeline:** p95 ≈ 4,6 ms; sem gargalo observado.

---

## Melhorias sugeridas

1. **Inbox:** Índices no fluxo da query (instance_steps + workflow_instances por company_id); cache Redis do resultado por (company_id, user_id); limitar número de steps retornados por página no banco; evitar leitura desnecessária de campos JSONB grandes quando só resolved_approvers for necessário.
2. **Approve:** Distribuir itens do inbox entre VUs (page/limit variável por VU) para reduzir contenção no mesmo step; revisar tempo de hold do lock (manter transação mínima); considerar índice em step_votes (step_id, approver_id) se ainda não coberto.
3. **Timeline:** Manter como está; cache opcional por instance_id só se houver necessidade futura.

---

## Referência

- k6: <https://grafana.com/docs/k6/latest/>
- Seed de carga: `npm run seed:load` (ver README).
