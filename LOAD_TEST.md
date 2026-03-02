# Relatório de testes de carga (k6)

Relatório dos testes de carga da API Workflow InCicle, atendendo aos requisitos do desafio (script + relatório com throughput, latência p95, taxa de erro, gargalo e proposta de melhoria). Ferramenta utilizada: **k6**.

---

## Escolhas de ferramenta e cenário

- **Ferramenta:** k6 (Grafana), conforme sugerido no desafio. Execução local, métricas consolidadas e thresholds configuráveis.
- **Base de dados:** Seed de carga com **10k instâncias** (2 empresas, 200 membros no organograma), conforme parâmetros mínimos: 1k draft, 4k pending, 3k approved, 2k rejected.
- **Cenário (rampa e sustentação):** descrito no README e nos próprios scripts:
  - **Rampa de subida:** 30s até o número de VUs alvo.
  - **Sustentação:** 2min com carga constante.
  - **Rampa de descida:** 15s até zero VUs.
- **Decisões de arquitetura (assíncrono/mensageria):** justificativas de uso de BullMQ/Redis, trade-offs e impacto em operação estão no **README.md** (seção "Decisões técnicas"). O relatório abaixo foca nos resultados de carga dos endpoints HTTP.

---

## Cenário e critérios de sucesso

**Thresholds configurados nos scripts:**

- `http_req_failed` &lt; 2%
- `http_req_duration` p(95) &lt; 500 ms

**Pré-requisito:** rodar o seed de carga antes dos testes (`npm run seed:load`) para base com 10k instâncias.

---

## Scripts

| Script             | Endpoint(s)                                                                 | Descrição                                      |
|--------------------|-----------------------------------------------------------------------------|------------------------------------------------|
| `inbox.test.js`    | GET `/v1/approvals/inbox?page=1&limit=20`                                   | Listagem do inbox do aprovador (leitura).     |
| `approve.test.js`  | GET inbox + POST `/v1/approvals/instances/:instanceId/steps/:stepId/approve` | Fluxo: obter item do inbox e aprovar (escrita).|
| `timeline.test.js` | GET `/v1/instances/:id/timeline`                                            | Timeline de uma instância (leitura).           |

**Variáveis de ambiente (opcionais):** `BASE_URL`, `COMPANY_ID`, `USER_ID` (default: API em localhost:3000, empresa 1 do seed-load).

**Exemplo de execução:**

```bash
k6 run load-tests/inbox.test.js
k6 run load-tests/approve.test.js
k6 run load-tests/timeline.test.js
```

---

## Resultados finais

Execução típica após `npm run seed:load`, com API + PostgreSQL + Redis rodando (ex.: Docker Compose).

### Throughput (req/s)

| Script    | Requisições totais | Duração (aprox.) | Requisições/s |
|-----------|--------------------|------------------|---------------|
| inbox     | 2 843              | 2m45s            | ~17,2         |
| approve   | 2 852              | 2m45s            | ~17,3         |
| timeline  | 2 850              | 2m45s            | ~17,2         |

*(No approve, cada iteração faz 2 requisições: GET inbox + POST approve.)*

### Latência p95

| Script    | p95 (ms) |
|-----------|----------|
| inbox     | 3,62     |
| approve   | 3,74     |
| timeline  | 3,90     |

### Taxa de erro

| Script    | http_req_failed |
|-----------|------------------|
| inbox     | 0,00%            |
| approve   | 0,00%            |
| timeline  | 0,00%            |

### Objetivos (thresholds)

- [x] **Taxa de erro** &lt; 2% em todos os scripts (atingido: 0%).
- [x] **Latência p95** &lt; 500 ms em todos os scripts (atingido: &lt; 4 ms nos três).

Os objetivos de latência e taxa de erro foram atingidos com margem ampla. Não foi necessário plano de mitigação por falha nos critérios.

---

## Gargalo identificado

Nas condições do teste (10 VUs para inbox/timeline, 5 VUs para approve, base 10k instâncias):

- **Nenhum gargalo crítico** que comprometa os critérios de p95 &lt; 500 ms ou taxa de erro &lt; 2%.
- **Inbox e approve** são os endpoints que tendem a custar mais (JOINs, leitura de snapshot JSONB, transação com lock no approve); em cenários de carga muito superior ou base de dados maior, podem ser os primeiros a exigir otimização.
- **Timeline** manteve latência baixa (leitura por ID, acesso direto).

---

## Proposta de melhoria técnica

Para **escala maior** ou **bases com volume bem superior a 10k instâncias**, sugere-se:

1. **Inbox:** Índices alinhados à query (ex.: `instance_steps` por status/instance_id e filtro por company_id); cache Redis do resultado por (company_id, user_id) com TTL; limitar/paginar no banco para evitar leitura excessiva de JSONB.
2. **Approve:** Manter transação curta (SELECT FOR UPDATE com lógica mínima); distribuir carga entre steps diferentes (evitar muitas VUs no mesmo step); índice em `step_votes (step_id, approver_id)` para checagem de voto duplicado.
3. **Timeline:** Manter como está; cache opcional por `instance_id` apenas se houver necessidade futura de redução adicional de carga no banco.
4. **Operação:** Monitorar conexões e pool do PostgreSQL; em cenários de alto throughput, avaliar view materializada ou tabela de inbox pré-calculada atualizada de forma assíncrona.

---

## Referência

- k6: <https://grafana.com/docs/k6/latest/>
- Seed de carga: `npm run seed:load` (ver README).
- Decisões de arquitetura (assíncrono/mensageria): README.md, seção "Decisões técnicas".
