Você é um engenheiro de software sênior desenvolvendo uma API de workflow de aprovações corporativas para a InCicle. Siga rigorosamente tudo que está definido abaixo. Não invente comportamentos não descritos. Se algo não estiver definido, pergunte antes de implementar.

---

## STACK OBRIGATÓRIA

- Framework: NestJS (TypeScript)
- Banco: PostgreSQL 15
- Mensageria: BullMQ (Redis 7)
- ORM: TypeORM
- Testes: Jest (unitários + integração + e2e)
- Carga: k6
- Documentação: OpenAPI (openapi.yaml)
- Execução: docker compose up (ambiente limpo, sem dependências locais)
- Validação de DTOs: class-validator + class-transformer

---

## ARQUITETURA

Clean Architecture com 4 camadas. Dependências apontam sempre para dentro — domain não conhece ninguém, application conhece apenas domain, infrastructure e presentation conhecem as camadas internas.

### Regra crítica de separação de entidades

As entidades em domain/entities/ são classes TypeScript puras, sem nenhum decorator do TypeORM. Elas representam o modelo de negócio.

As entidades de persistência ficam em infrastructure/database/entities/ com os decorators @Entity, @Column, @ManyToOne etc. do TypeORM.

Os repositórios na infrastructure/ fazem o mapeamento entre entidade de persistência e entidade de domínio. Nunca expor entidades TypeORM fora da camada de infraestrutura.

---

## ESTRUTURA DE DIRETÓRIOS
src/
├── domain/
│   ├── entities/                        # Classes puras sem decorators
│   │   ├── template.entity.ts
│   │   ├── template-version.entity.ts
│   │   ├── workflow-instance.entity.ts
│   │   ├── instance-step.entity.ts
│   │   ├── step-vote.entity.ts
│   │   ├── delegation.entity.ts
│   │   ├── org-chart-member.entity.ts
│   │   └── audit-log.entity.ts
│   ├── value-objects/
│   │   ├── approval-rule.vo.ts          # ALL | ANY | QUORUM
│   │   ├── sla-config.vo.ts
│   │   ├── snapshot.vo.ts               # 4 campos obrigatórios
│   │   └── company-id.vo.ts
│   ├── exceptions/                      # Exceções de domínio
│   │   ├── delegation-cycle.exception.ts
│   │   ├── delegation-expired.exception.ts
│   │   ├── step-already-resolved.exception.ts
│   │   ├── version-not-published.exception.ts
│   │   └── duplicate-vote.exception.ts
│   ├── repositories/                    # Interfaces (ports)
│   │   ├── template.repository.ts
│   │   ├── template-version.repository.ts
│   │   ├── instance.repository.ts
│   │   ├── step.repository.ts
│   │   ├── delegation.repository.ts
│   │   ├── org-chart.repository.ts
│   │   └── audit.repository.ts
│   └── services/                        # Domain services puros
│       ├── approval-rule.service.ts     # Lógica ALL/ANY/QUORUM
│       ├── delegation-cycle.service.ts  # DFS para detectar ciclo
│       └── sla.service.ts
│
├── application/
│   ├── templates/
│   │   ├── create-template.usecase.ts
│   │   ├── create-version.usecase.ts
│   │   ├── publish-version.usecase.ts
│   │   ├── list-templates.usecase.ts
│   │   └── get-template.usecase.ts
│   ├── instances/
│   │   ├── create-instance.usecase.ts
│   │   ├── submit-instance.usecase.ts   # Gera snapshot imutável
│   │   ├── get-instance.usecase.ts
│   │   ├── list-instances.usecase.ts
│   │   └── get-timeline.usecase.ts
│   ├── approvals/
│   │   ├── approve-step.usecase.ts      # Lock + idempotência + convergência
│   │   ├── reject-step.usecase.ts
│   │   └── get-inbox.usecase.ts
│   └── delegations/
│       ├── create-delegation.usecase.ts # Detecta ciclo antes de salvar
│       ├── list-delegations.usecase.ts
│       ├── list-active-delegations.usecase.ts
│       └── delete-delegation.usecase.ts
│
├── infrastructure/
│   ├── database/
│   │   ├── entities/                    # Entidades TypeORM com decorators
│   │   ├── migrations/                  # Geradas via TypeORM CLI
│   │   ├── seeds/
│   │   │   ├── seed.ts                  # Seed básico
│   │   │   └── seed-load.ts             # 10k instâncias para k6
│   │   └── repositories/               # Implementações concretas TypeORM
│   ├── messaging/
│   │   ├── queues/
│   │   │   ├── sla.queue.ts
│   │   │   ├── audit.queue.ts
│   │   │   └── approval-event.queue.ts
│   │   └── processors/
│   │       ├── sla.processor.ts
│   │       └── audit.processor.ts
│   └── http/
│       └── interceptors/
│           ├── tenant.interceptor.ts
│           └── idempotency.interceptor.ts
│
├── presentation/
│   ├── filters/
│   │   └── domain-exception.filter.ts  # Mapeia exceções de domínio para HTTP
│   ├── templates/
│   │   ├── templates.controller.ts
│   │   └── dtos/
│   ├── instances/
│   │   ├── instances.controller.ts
│   │   └── dtos/
│   ├── approvals/
│   │   ├── approvals.controller.ts
│   │   └── dtos/
│   ├── delegations/
│   │   ├── delegations.controller.ts
│   │   └── dtos/
│   ├── analytics/
│   │   ├── analytics.controller.ts
│   │   └── dtos/
│   └── health/
│       └── health.controller.ts
│
test/
├── unit/
├── integration/
└── e2e/
load-tests/
├── inbox.test.js
├── approve.test.js
└── timeline.test.js

---

## MÓDULOS NESTJS

Criar um módulo por domínio:
- TemplatesModule
- InstancesModule
- ApprovalsModule
- DelegationsModule
- AnalyticsModule
- HealthModule (usando @nestjs/terminus)
- MessagingModule (BullMQ — registrar todas as filas aqui)
- SharedModule (guards, interceptors, filtros globais, utilitários)

---

## CONFIGURAÇÃO GLOBAL DO NESTJS (main.ts)
```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}));
app.useGlobalFilters(new DomainExceptionFilter());
app.enableVersioning({ type: VersioningType.URI });
// Todos os endpoints sob /v1/
```

---

## AUTENTICAÇÃO SIMPLIFICADA

Não usar OAuth ou JWT. O usuário e a empresa são identificados por headers em toda requisição:
- X-Company-ID: UUID da empresa (multi-tenancy)
- X-User-ID: UUID do usuário autenticado

Criar TenantGuard global que rejeita com 400 qualquer requisição sem ambos os headers presentes.

O X-Company-ID é injetado em todos os repositórios automaticamente via contexto de requisição.

O X-User-ID é usado como actor_id em audit_logs e para filtrar o inbox de aprovações.

---

## BANCO DE DADOS — TABELAS
```sql
companies (
  id uuid PRIMARY KEY,
  name varchar NOT NULL,
  created_at timestamptz DEFAULT NOW()
)

org_chart_members (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies(id),
  user_id uuid NOT NULL,
  name varchar NOT NULL,
  email varchar NOT NULL,
  department varchar NOT NULL,
  role varchar NOT NULL,
  manager_id uuid REFERENCES org_chart_members(id),
  created_at timestamptz DEFAULT NOW()
)

templates (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies(id),
  name varchar NOT NULL,
  description text,
  created_at timestamptz DEFAULT NOW()
)

template_versions (
  id uuid PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES templates(id),
  version_number integer NOT NULL,
  status varchar NOT NULL DEFAULT 'draft',  -- draft | published
  definition jsonb NOT NULL,
  published_at timestamptz,
  created_at timestamptz DEFAULT NOW()
)

workflow_instances (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies(id),
  template_version_id uuid NOT NULL REFERENCES template_versions(id),
  snapshot jsonb NOT NULL,
  status varchar NOT NULL DEFAULT 'draft',  -- draft | pending | approved | rejected
  submitted_at timestamptz,
  created_at timestamptz DEFAULT NOW()
)

instance_steps (
  id uuid PRIMARY KEY,
  instance_id uuid NOT NULL REFERENCES workflow_instances(id),
  step_ref varchar NOT NULL,
  order_index integer NOT NULL,
  rule varchar NOT NULL,  -- ALL | ANY | QUORUM
  quorum_count integer,
  status varchar NOT NULL DEFAULT 'pending',  -- pending | approved | rejected | skipped
  sla_hours integer NOT NULL,
  sla_deadline timestamptz,
  sla_breached boolean DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT NOW()
)

step_votes (
  id uuid PRIMARY KEY,
  step_id uuid NOT NULL REFERENCES instance_steps(id),
  approver_id uuid NOT NULL,
  decision varchar NOT NULL,  -- approve | reject
  delegated_by uuid,          -- uuid do delegador, se aplicável
  voted_at timestamptz DEFAULT NOW(),
  CONSTRAINT uq_step_approver UNIQUE (step_id, approver_id)
)

delegations (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies(id),
  delegator_id uuid NOT NULL,
  delegate_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT NOW()
)

audit_logs (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL,
  entity_type varchar NOT NULL,
  entity_id uuid NOT NULL,
  action varchar NOT NULL,
  actor_id uuid NOT NULL,
  payload jsonb,
  created_at timestamptz DEFAULT NOW()
  -- NUNCA UPDATE ou DELETE nesta tabela. Apenas INSERT.
)
```

---

## MIGRATIONS

Geradas via TypeORM CLI com naming convention: {timestamp}-{NomeDaAction}.ts

Ordem obrigatória:
1. CreateCompaniesTable
2. CreateOrgChartMembersTable
3. CreateTemplatesTable
4. CreateTemplateVersionsTable
5. CreateWorkflowInstancesTable
6. CreateInstanceStepsTable
7. CreateStepVotesTable
8. CreateDelegationsTable
9. CreateAuditLogsTable
10. CreateIndexes (todos os índices em migration separada)

Migration de índices obrigatórios:
```sql
CREATE INDEX idx_instances_company_status ON workflow_instances(company_id, status);
CREATE INDEX idx_steps_instance_id ON instance_steps(instance_id);
CREATE INDEX idx_votes_step_id ON step_votes(step_id);
CREATE INDEX idx_delegations_delegate_expires ON delegations(delegate_id, expires_at);
CREATE INDEX idx_delegations_delegator_id ON delegations(delegator_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_company ON audit_logs(company_id);
```

---

## CONTRATO DE API COMPLETO

Todos os endpoints sob /v1/

### Templates
POST   /v1/templates
POST   /v1/templates/:id/versions
POST   /v1/templates/:id/versions/:versionId/publish
GET    /v1/templates
GET    /v1/templates/:id

### Instâncias
POST   /v1/instances
POST   /v1/instances/:id/submit
GET    /v1/instances
GET    /v1/instances/:id
GET    /v1/instances/:id/timeline

### Aprovações
GET    /v1/approvals/inbox
POST   /v1/approvals/:instanceId/steps/:stepId/approve
POST   /v1/approvals/:instanceId/steps/:stepId/reject

### Delegações
POST   /v1/delegations
GET    /v1/delegations
GET    /v1/delegations/active
DELETE /v1/delegations/:id

### Operação
GET    /v1/analytics/sla-compliance
GET    /health
GET    /health/ready

---

## COMPORTAMENTO DETALHADO DOS ENDPOINTS

### GET /v1/approvals/inbox
Retorna todos os instance_steps com status 'pending' onde X-User-ID é aprovador, considerando delegações ativas. Se o usuário é delegado de alguém (delegations onde delegate_id = X-User-ID e expires_at > NOW()), os steps do delegador também aparecem no inbox. Suporta paginação via query params: page (default 1) e limit (default 20). Filtra obrigatoriamente por company_id.

### GET /v1/analytics/sla-compliance
Retorna métricas de conformidade de SLA filtradas por company_id. Aceita query params opcionais: from e to (ISO 8601) para filtrar por período. Resposta:
```json
{
  "total_instances": "number",
  "total_steps": "number",
  "breached_steps": "number",
  "compliance_rate": "number (percentual 0-100)",
  "breached_by_step": [{ "step_ref": "string", "count": "number" }],
  "period": { "from": "string|null", "to": "string|null" }
}
```

### GET /health
Liveness check. Retorna 200 se a aplicação está no ar.

### GET /health/ready
Readiness check via @nestjs/terminus. Verifica conectividade com PostgreSQL e Redis. Retorna 200 se ambos estão disponíveis, 503 se qualquer dependência estiver indisponível.

---

## COMPORTAMENTOS OBRIGATÓRIOS

### Multi-tenancy
- TenantGuard global valida X-Company-ID e X-User-ID em toda requisição
- Todos os repositórios recebem company_id via contexto e filtram automaticamente
- Nenhuma query pode retornar dados de company_id diferente do header
- Usar REQUEST-scoped providers do NestJS para propagar o contexto de tenant

### Snapshot no Submit
O use case submit-instance.usecase.ts deve:
1. Verificar que a versão do template está publicada (lançar VersionNotPublishedException caso contrário)
2. Resolver os aprovadores atuais de cada step via org_chart_members
3. Montar e gravar o snapshot com exatamente estes 4 campos:
```json
{
  "template_version": {
    "id": "uuid",
    "version_number": "number",
    "definition": {}
  },
  "resolved_flow": [
    {
      "step_ref": "string",
      "order_index": "number",
      "rule": "ALL|ANY|QUORUM",
      "quorum_count": "number|null",
      "sla_hours": "number"
    }
  ],
  "resolved_approvers": {
    "step_ref": ["uuid"]
  },
  "org_context": [
    {
      "user_id": "uuid",
      "name": "string",
      "email": "string",
      "department": "string",
      "role": "string"
    }
  ]
}
```
4. Criar os instance_steps baseados no resolved_flow
5. Agendar job BullMQ de SLA para cada step com delay = sla_hours * 3600 * 1000
6. O campo snapshot em workflow_instances nunca deve ser alterado após este momento

### Idempotência em Aprovações
- Verificar na tabela step_votes se (step_id, approver_id) já existe ANTES de adquirir o lock
- Se já existe, retornar sucesso silencioso sem nenhum efeito colateral
- A constraint UNIQUE(step_id, approver_id) é a segunda linha de defesa no banco

### Controle de Concorrência — Fluxo Completo da Transação
O approve-step.usecase.ts e reject-step.usecase.ts devem executar dentro de uma única transação TypeORM via DataSource.transaction ou queryRunner:

BEGIN
Verificar idempotência: SELECT step_votes WHERE step_id AND approver_id
Se já votou: COMMIT e retornar sucesso
SELECT instance_step FOR UPDATE (pessimistic lock)
Verificar convergência: se step.status != 'pending', ignorar e COMMIT
Resolver delegação: verificar se existe delegação ativa válida
INSERT step_vote (com delegated_by se aplicável)
Recalcular status do step com ApprovalRuleService
Se regra satisfeita: UPDATE instance_step status + resolved_at
Verificar se todos os steps da instância foram resolvidos
Se sim: UPDATE workflow_instance status
Publicar evento na fila de auditoria (dentro da transação)
COMMIT


### Convergência Fora de Ordem
- Se step.status != 'pending' no momento do lock (passo 5 acima), ignorar o voto graciosamente
- Logar o evento com logger.warn mas não lançar exceção
- Retornar sucesso para o cliente

### Regras de Aprovação (ApprovalRuleService)
Lógica exclusivamente no domain service, sem dependência de infraestrutura:
- ALL: contagem de votos 'approve' == total de aprovadores do step E nenhum voto 'reject'
- ANY: pelo menos 1 voto 'approve' existe
- QUORUM: contagem de votos 'approve' >= floor(total_aprovadores / 2) + 1
- Se qualquer aprovador rejeita em ALL: step vai para 'rejected' imediatamente
- Se qualquer aprovador rejeita em QUORUM e votos negativos tornam quorum impossível: step vai para 'rejected'

### Delegação
- No fluxo de aprovação, antes do passo 4 da transação, verificar se existe delegação ativa
- Query: SELECT FROM delegations WHERE delegator_id = approver_id AND delegate_id = X-User-ID AND expires_at > NOW()
- Se delegação encontrada: aceitar decisão e gravar delegated_by = delegator_id no step_vote
- Se delegação expirada for encontrada mas usada: lançar DelegationExpiredException (HTTP 422)

### Detecção de Ciclo em Delegação (DelegationCycleService)
Antes de INSERT em delegations, executar DFS no grafo de delegações ativas:
- Carregar todas as delegações ativas da empresa (expires_at > NOW())
- Simular adição da nova delegação no grafo
- Executar DFS a partir do delegator_id
- Se o caminho do DFS atingir o delegator_id original: lançar DelegationCycleException (HTTP 422)
- Exemplo bloqueado: A -> B -> C -> A

### SLA (BullMQ Delayed Jobs)
- No submit, agendar um job por step: { delay: sla_hours * 3600 * 1000 }
- O SlaProcessor ao disparar deve: buscar o step, verificar se ainda está 'pending'
- Se pendente: UPDATE sla_breached = true, INSERT em audit_logs com action 'SLA_BREACHED'
- Usar SLA_DEFAULT_HOURS do .env como fallback se step não tiver sla_hours definido

### Auditoria
- Todo approve/reject publica evento na fila de auditoria via BullMQ
- AuditProcessor recebe o evento e faz INSERT em audit_logs
- O repositório de auditoria só expõe método create(). Nenhum update() ou delete() existe
- Ações que geram auditoria: INSTANCE_SUBMITTED, STEP_APPROVED, STEP_REJECTED, STEP_DELEGATED, SLA_BREACHED, DELEGATION_CREATED, DELEGATION_DELETED, JOB_FAILED

### BullMQ — Configuração de Resiliência
Todo job BullMQ deve ser configurado com:
```typescript
{
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 }
}
```
Em caso de falha permanente (após todos os retries), o processor deve capturar o evento onFailed e inserir em audit_logs com action 'JOB_FAILED' e o payload do erro.

---

## EXCEÇÕES DE DOMÍNIO E MAPEAMENTO HTTP

Criar em domain/exceptions/:

| Exceção                      | HTTP | Código de erro                    |
|-----------------------------|------|-----------------------------------|
| DelegationCycleException    | 422  | DELEGATION_CYCLE_DETECTED         |
| DelegationExpiredException  | 422  | DELEGATION_EXPIRED                |
| StepAlreadyResolvedException| 409  | STEP_ALREADY_RESOLVED             |
| VersionNotPublishedException| 422  | VERSION_NOT_PUBLISHED             |
| DuplicateVoteException      | 409  | DUPLICATE_VOTE                    |

O DomainExceptionFilter em presentation/filters/ intercepta todas essas exceções e retorna:
```json
{
  "error": "DELEGATION_CYCLE_DETECTED",
  "message": "mensagem legível",
  "statusCode": 422
}
```

---

## TESTES OBRIGATÓRIOS

### Unitários (test/unit/)
- ApprovalRuleService: testar ALL, ANY e QUORUM com todas as combinações de votos possíveis
- DelegationCycleService: testar ciclo direto (A->B->A), ciclo indireto (A->B->C->A) e sem ciclo
- SlaService: testar cálculo de deadline e detecção de estouro
- SnapshotVO: testar que os 4 campos obrigatórios estão presentes e são imutáveis

### Integração (test/integration/)
- Repositórios com banco PostgreSQL real (usar banco separado de teste)
- Filtro de company_id em todos os repositórios (dado de outra empresa nunca retorna)
- Constraint UNIQUE(step_id, approver_id) lança erro ao inserir voto duplicado

### E2E (test/e2e/) — 8 cenários obrigatórios em ordem

**Cenário 1 — Submit com snapshot**
Criar template → publicar versão → criar instância → submeter → verificar que snapshot tem os 4 campos obrigatórios preenchidos corretamente

**Cenário 2 — Aprovação idempotente**
Aprovar um step → repetir exatamente a mesma requisição → verificar que step_votes tem apenas 1 registro e o status do step não mudou indevidamente

**Cenário 3 — Corrida concorrente**
Submeter instância com step de regra ANY → disparar N=20 requisições simultâneas de approve para o mesmo step → verificar que step_votes tem exatamente 1 registro e step.status = 'approved'

**Cenário 4 — Delegação ativa**
Criar delegação ativa → aprovar step usando o header X-User-ID do delegado → verificar que step_vote.delegated_by = delegator_id e decisão foi aceita

**Cenário 5 — Ciclo de delegação**
Criar delegações A->B e B->C → tentar criar C->A → verificar que retorna 422 com error: DELEGATION_CYCLE_DETECTED

**Cenário 6 — Delegação expirada**
Criar delegação com expires_at no passado → tentar aprovar usando o delegado → verificar que retorna 422 com error: DELEGATION_EXPIRED

**Cenário 7 — Snapshot imutável após mudança no org chart**
Submeter instância → capturar snapshot → alterar org_chart_members (trocar department ou role do aprovador) → buscar instância novamente → verificar que snapshot.org_context não mudou

**Cenário 8 — Falha de dependência**
Simular indisponibilidade do Redis via mock do BullMQ → executar approve → verificar que API retorna 503 → restaurar Redis → verificar que GET /health/ready volta a retornar 200

---

## TESTE DE CARGA (k6)

### seed-load.ts
Popular o banco com no mínimo:
- 2 empresas
- 100 usuários por empresa no org_chart
- 10.000 workflow_instances com steps e votes variados
- Distribuição realista de status: 40% pending, 30% approved, 20% rejected, 10% draft

### Scripts k6 em load-tests/

Todos os scripts seguem este padrão de rampa:
```javascript
stages: [
  { duration: '30s', target: 50 },   // subida
  { duration: '2m', target: 50 },    // sustentação
  { duration: '15s', target: 0 },    // descida
]
thresholds: {
  http_req_failed: ['rate<0.02'],     // taxa de erro < 2%
  http_req_duration: ['p(95)<500'],   // p95 < 500ms
}
```

Arquivos:
- load-tests/inbox.test.js → GET /v1/approvals/inbox
- load-tests/approve.test.js → POST /v1/approvals/:instanceId/steps/:stepId/approve
- load-tests/timeline.test.js → GET /v1/instances/:id/timeline

---

## ENTREGÁVEIS — TODOS OBRIGATÓRIOS

1. Código fonte completo no repositório Git
2. README.md contendo:
   - Instruções de setup e execução (docker compose up)
   - Decisão técnica sobre BullMQ/Redis vs RabbitMQ vs Kafka com trade-offs reais
   - Justificativa do N=20 para o teste concorrente
   - Descrição do cenário de carga (rampa + sustentação + critérios)
   - Variáveis de ambiente e seus propósitos
3. openapi.yaml documentando todos os endpoints com request/response schemas
4. Migrations em ordem + seed.ts + seed-load.ts
5. LOAD_TEST.md com: throughput (req/s), latência p95, taxa de erro, gargalo identificado e proposta de melhoria técnica
6. Coleção Postman ou arquivo .http cobrindo todos os endpoints
7. docker-compose.yml funcional subindo API + PostgreSQL + Redis
8. .env.example com exatamente estes campos:
```env
APP_PORT=
DB_HOST=
DB_PORT=
DB_NAME=
DB_USER=
DB_PASSWORD=
ASYNC_PROVIDER=bullmq
ASYNC_URL=
LOG_LEVEL=
SLA_DEFAULT_HOURS=
```

---

## DOCKER COMPOSE
```yaml
services:
  api:
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  postgres:
    image: postgres:15
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $DB_USER"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
```

A API deve rodar migrations automaticamente no boot antes de aceitar requisições.

---

## RESTRIÇÕES — NUNCA VIOLAR

- Nunca fazer UPDATE ou DELETE em audit_logs
- Nunca retornar dados de company_id diferente do header X-Company-ID
- Nunca permitir submit de instância com versão não publicada
- Nunca aceitar delegação expirada sem lançar DelegationExpiredException
- Nunca aceitar delegação que forma ciclo sem lançar DelegationCycleException
- Nunca alterar o campo snapshot de workflow_instances após o submit
- Nunca colocar lógica de negócio em controllers — controllers apenas recebem, delegam e respondem
- Nunca expor entidades TypeORM fora da camada infrastructure
- Nunca usar decorators do TypeORM em entidades do domain

---

## ORDEM DE DESENVOLVIMENTO

Seguir exatamente esta ordem:

1. Setup do projeto NestJS + TypeORM + BullMQ + Docker Compose + .env.example
2. Domínio puro: entidades limpas, value objects, exceções, interfaces de repositório, domain services
3. Todas as migrations em ordem + seed básico
4. SharedModule: TenantGuard, interceptors, DomainExceptionFilter, ValidationPipe global
5. TemplatesModule completo (CRUD + versions + publish)
6. InstancesModule: create + submit com snapshot obrigatório e agendamento de SLA
7. ApprovalsModule: approve + reject com transação completa, lock, idempotência e convergência
8. Regras ALL / ANY / QUORUM no ApprovalRuleService
9. DelegationsModule: create com detecção de ciclo + list + delete + validação de expiração
10. MessagingModule: SLA processor + Audit processor com retry e dead letter
11. AnalyticsModule: sla-compliance com query analítica
12. HealthModule: liveness + readiness com @nestjs/terminus
13. Testes unitários → integração → 8 cenários e2e
14. seed-load.ts com 10k instâncias
15. Scripts k6 + LOAD_TEST.md
16. openapi.yaml completo
17. Coleção Postman ou .http
18. README.md completo com todas as justificativas