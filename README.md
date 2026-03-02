# API Workflow InCicle

API de workflow de aprovações corporativas para ambiente multiempresa (desafio técnico InCicle).

**Validação:** a entrega oficial é validada via Docker Compose em ambiente limpo. O projeto garante que tudo funciona corretamente no Docker, independente do sistema operacional do host (Linux, macOS, Windows). Não é obrigatório ter Node.js instalado na máquina para subir a API e rodar o seed.

---

## 1. Execução do projeto

Variáveis de ambiente são carregadas a partir de `.env`. Copie o exemplo e ajuste se necessário:

```bash
cp .env.example .env
```

### Com Docker Compose (recomendado — qualquer SO)

Na raiz do projeto, com Docker e Docker Compose instalados:

```bash
docker compose up --build
```

A API sobe na porta 3000. As migrations rodam automaticamente no boot. Endpoints de saúde:

- **Liveness:** `GET http://localhost:3000/health`
- **Readiness:** `GET http://localhost:3000/health/ready` (verifica PostgreSQL e Redis)

### Seed (dados iniciais) — com Docker

Após a API estar rodando (`docker compose up --build`), rode o seed **dentro do Docker** (não é necessário ter Node.js no host):

```bash
docker compose run --rm seed
```

Isso popula 1 empresa, 3 membros do organograma, 1 template e 1 versão publicada (útil para testes manuais e e2e).

### Seed e testes no host (opcional)

Se quiser rodar seed ou testes (unit, integration, e2e) **na sua máquina** em vez de no Docker, é necessário instalar as dependências antes:

```bash
npm install
```

Depois, por exemplo:

- Seed básico: `npm run seed` (com API e Postgres acessíveis; use `DB_HOST=localhost` etc. no `.env` se os serviços estiverem no host ou expostos).
- Seed de carga: `npm run seed:load`
- Testes: `npm run test:unit`, `npm run test:integration`, `npm run test:e2e` (e2e exige serviços rodando e seed básico aplicado).

### Sem Docker (desenvolvimento)

Com PostgreSQL 15 e Redis 7 rodando localmente:

```bash
cp .env.example .env
# Ajuste DB_HOST, DB_PORT, REDIS_HOST, REDIS_PORT se necessário
npm install
npm run build
npm run start:prod
```

Ou em modo watch: `npm run start:dev`

### Variáveis de ambiente

| Variável         | Descrição                    | Exemplo / padrão     |
|------------------|------------------------------|----------------------|
| `APP_PORT`       | Porta HTTP da API            | `3000`               |
| `DB_HOST`        | Host do PostgreSQL           | `localhost`          |
| `DB_PORT`        | Porta do PostgreSQL          | `5432`               |
| `DB_NAME`        | Nome do banco                | `incicle`            |
| `DB_USER`        | Usuário do banco             | `postgres`           |
| `DB_PASSWORD`    | Senha do banco               | —                    |
| `REDIS_HOST`     | Host do Redis                | `localhost`          |
| `REDIS_PORT`     | Porta do Redis               | `6379`               |
| `REDIS_PASSWORD` | Senha do Redis (opcional)    | vazio                |
| `ASYNC_PROVIDER` | Provedor de filas            | `bullmq`             |
| `ASYNC_URL`      | URL do Redis para BullMQ     | `redis://localhost:6379` |
| `LOG_LEVEL`      | Nível de log                 | `info`               |
| `SLA_DEFAULT_HOURS` | SLA padrão em horas (steps sem definição) | `24` |

### Rodando os testes

**Se rodar na sua máquina:** execute `npm install` antes de qualquer comando abaixo.

#### Testes unitários

```bash
npm run test:unit
```

#### Testes de integração

Requer PostgreSQL rodando (ex.: `docker compose up -d postgres`). No host, use `DB_HOST=localhost` (ou o que estiver no `.env`).

```bash
npm run test:integration
```

#### Testes E2E

Requer todos os serviços rodando (ex.: `docker compose up -d`) e dados iniciais aplicados. Seed pelo Docker ou no host:

- **Pelo Docker:** `docker compose run --rm seed`
- **No host:** `npm install` e depois `npm run seed` (com `.env` apontando para o banco)

Em seguida:

```bash
npm run test:e2e
```

### Seed de carga (testes de carga / k6)

Para base realista em testes de carga (ex.: k6): 2 empresas, ~100 usuários por empresa no organograma e 10.000 instâncias (40% pending, 30% approved, 20% rejected, 10% draft). Rodar com banco vazio ou dedicado, após as migrations. **No host:** rode `npm install` antes.

```bash
npm run seed:load
```

### Testes de carga (k6)

Scripts em `load-tests/`: `inbox.test.js`, `approve.test.js`, `timeline.test.js`. Rodar após o seed de carga. Relatório e critérios em [LOAD_TEST.md](LOAD_TEST.md). **k6 deve estar instalado no host** (veja seção "Instalação no host", abaixo).

**Cenário:** rampa de subida 30s, sustentação 2min, rampa de descida 15s. Critérios de sucesso: `http_req_failed < 2%`, `http_req_duration` p95 &lt; 500 ms.

```bash
k6 run load-tests/inbox.test.js
k6 run load-tests/approve.test.js
k6 run load-tests/timeline.test.js
```

### Coleção Postman

Para testes manuais, importe a coleção em `postman/API-Workflow-InCicle.postman_collection.json`. Inclui todos os endpoints (templates, instances, approvals, delegations, analytics, health) e variáveis para `base_url`, `X-Company-ID` e `X-User-ID`. Ver [postman/README.md](postman/README.md).

### Estrutura de pastas

```
src/
├── domain/           # entidades, value objects, exceções e serviços de domínio (sem infra)
├── application/      # use cases, ports e adapters (templates, instances, approvals, delegations, analytics)
├── infrastructure/   # persistência (TypeORM, migrations, seeds), filas (BullMQ), health
│   ├── database/     # entities de persistência, repositórios, migrations, seeds, Redis health
│   └── messaging/    # processadores de fila (audit, SLA)
└── presentation/     # controllers, DTOs, filters, middleware (tenant), guards
    ├── health/       # GET /health (liveness) e GET /health/ready (readiness)
    ├── templates/    # templates e versões
    ├── instances/    # instâncias, submit, timeline
    ├── approvals/    # inbox, approve, reject
    ├── delegations/  # CRUD de delegações
    └── analytics/    # sla-compliance
test/
├── unit/             # ApprovalRuleService, DelegationCycleService, SlaService, Snapshot VO
├── integration/      # repositórios com PostgreSQL, constraint step_votes
└── e2e/              # fluxo completo (workflow.e2e-spec.ts)
load-tests/           # scripts k6 (inbox, approve, timeline)
postman/              # coleção Postman (API-Workflow-InCicle.postman_collection.json)
openapi.yaml          # especificação OpenAPI 3 (endpoints, schemas, erros 4xx/5xx)
```

### Documentação e entregáveis

| Entregável | Descrição |
|------------|-----------|
| [openapi.yaml](openapi.yaml) | Especificação OpenAPI 3: endpoints, schemas, headers, códigos 400/409/422/503. Utilizável para geração de clientes ou import no Postman. |
| [LOAD_TEST.md](LOAD_TEST.md) | Relatório de testes de carga (k6): throughput, latência p95, taxa de erro, gargalos e melhorias sugeridas. |
| [postman/](postman/) | Coleção Postman com todos os endpoints e variáveis (base_url, X-Company-ID, X-User-ID). |
| `src/infrastructure/database/migrations/` | Migrations TypeORM (companies, org_chart, templates, instances, steps, votes, delegations, audit_logs, índices). |
| `docker compose run --rm seed` | Seed básico dentro do Docker (recomendado; não exige Node no host). |
| `npm run seed` | Seed básico no host (1 empresa, 3 membros, 1 template/versão); requer `npm install` antes. |
| `npm run seed:load` | Seed de carga no host (2 empresas, 200 membros, 10k instâncias) para k6; requer `npm install` antes. |
| [load-tests/](load-tests/) | Scripts k6: inbox, approve, timeline. |

---

## 2. Instalação no host (opcional)

Só é necessário se você quiser rodar a API ou os testes **fora do Docker** (ex.: desenvolvimento local) ou rodar **k6** para testes de carga. Em muitos sistemas já existem Docker e Docker Compose; nesse caso, a execução com Docker (seção 1) basta.

Exemplo abaixo para **Fedora**. Em outros sistemas, use o instalador oficial de Node.js, Docker e k6.

### Git

```bash
sudo dnf install -y git
git --version
```

### Node.js 20 LTS (para seed/testes no host)

**Opção A — NodeSource (recomendado para Node 20):**

```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs
node -v   # deve ser v20.x
npm -v
```

**Opção B — Repositório padrão Fedora:**

```bash
sudo dnf install -y nodejs npm
node -v   # confira se é 18+ (recomendado 20+)
npm -v
```

### Docker Engine e Docker Compose

```bash
sudo dnf install -y dnf-plugins-core
```

- **Fedora 41+ (DNF 5):** `sudo dnf config-manager addrepo --from-repofile=https://download.docker.com/linux/fedora/docker-ce.repo`
- **Fedora 40 ou anterior (DNF 4):** `sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo`

```bash
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
```

Faça logout e login (ou `newgrp docker`) e confira: `docker --version` e `docker compose version`.  
Se aparecer *permission denied* ao usar Docker, use um novo terminal com `newgrp docker` ou `sudo docker compose up --build`.

### k6 (testes de carga)

```bash
sudo dnf install -y https://dl.k6.io/rpm/repo.rpm
sudo dnf install -y k6
k6 version
```

---

## 3. Decisões técnicas

### BullMQ/Redis em vez de RabbitMQ/Kafka

A API usa **BullMQ** com **Redis** para filas assíncronas (jobs de SLA, auditoria). Principais motivos:

- **Ecossistema NestJS:** integração nativa com `@nestjs/bullmq` e injeção de filas por nome; menos boilerplate que adaptadores para RabbitMQ/Kafka.
- **Operação:** Redis já é exigido para cache/session em muitos ambientes; evitar um broker adicional (RabbitMQ/Kafka) reduz dependências e custo operacional em ambiente de desafio/avaliação.
- **Latência:** para volumes moderados (SLA e eventos de auditoria), Redis é suficiente; Kafka e RabbitMQ brilham em throughput muito alto e retenção longa, não essenciais aqui.
- **Trade-off:** em produção com alto volume de eventos ou necessidade de replay/auditoria em log imutável, Kafka poderia ser considerado; para esta API, BullMQ+Redis atende e simplifica o setup.

---

## Testes automatizados

### Justificativa do N=20 no teste concorrente (E2E)

O cenário E2E **“Corrida concorrente”** envia **N=20** requisições paralelas de approve no mesmo step (regra ANY). Objetivo: garantir que apenas **uma** decisão é efetiva (idempotência e lock no banco).

- **N=20** equilibra **stress** (concorrência real, múltiplas conexões e locks) e **tempo de execução** (evitar suíte E2E longa). Valores bem menores (ex.: 5) reduzem a chance de falhar em race; valores maiores (ex.: 100) alongam o teste sem ganho proporcional de confiança para o requisito “uma decisão efetiva”.
- O teste verifica que o número de votos gravados no step é 1 e que a instância transita para o estado esperado após a resolução.

---

## Verificação rápida (ambiente)

- **Apenas Docker:** confira que Docker e Docker Compose estão disponíveis: `docker --version && docker compose version`. Depois: `cp .env.example .env && docker compose up --build` e, em outro terminal, `docker compose run --rm seed`.
- **Com Node/k6 no host:** além do acima, `node -v && npm -v && k6 version`. Antes de rodar seed ou testes no host, execute `npm install`.
