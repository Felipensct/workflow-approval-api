# API Workflow InCicle

API de workflow de aprovações corporativas para ambiente multiempresa (desafio técnico InCicle).

A entrega é validada via **Docker Compose em ambiente limpo**. Tudo (API, seed, testes unitários, de integração e e2e) roda com Docker; não é necessário ter Node.js instalado no host.

---

## Pré-requisitos

- **Docker** e **Docker Compose** instalados (`docker --version`, `docker compose version`).

---

## Como rodar (clone → API → seed → testes)

Na raiz do projeto:

```bash
# 1. Copiar variáveis de ambiente
cp .env.example .env

# 2. Subir API, PostgreSQL e Redis (migrations rodam no boot)
docker compose up -d --build

# 3. Popular dados iniciais (1 empresa, 3 membros, 1 template/versão, 1 instância submetida)
docker compose run --rm seed

# 4. Rodar testes (unitários, integração, e2e)
docker compose --profile test run --rm test-unit
docker compose --profile test run --rm test-integration
docker compose --profile test run --rm test-e2e
```

A API fica em **http://localhost:3000**. Endpoints de saúde:

- **Liveness:** `GET http://localhost:3000/health`
- **Readiness:** `GET http://localhost:3000/health/ready` (PostgreSQL e Redis)

---

## Variáveis de ambiente

O `.env.example` contém as variáveis obrigatórias do desafio. Principais:

| Variável            | Descrição                         | Exemplo / padrão          |
|---------------------|-----------------------------------|---------------------------|
| `APP_PORT`          | Porta HTTP da API                 | `3000`                    |
| `DB_HOST`           | Host do PostgreSQL                | `localhost` (host) / `postgres` (Docker) |
| `DB_PORT`           | Porta do PostgreSQL               | `5432`                    |
| `DB_NAME`           | Nome do banco                     | `incicle`                 |
| `DB_USER`           | Usuário do banco                  | `postgres`                |
| `DB_PASSWORD`       | Senha do banco                    | —                         |
| `ASYNC_PROVIDER`    | Provedor de filas                 | `bullmq`                  |
| `ASYNC_URL`         | URL do Redis para BullMQ          | `redis://localhost:6379`  |
| `LOG_LEVEL`         | Nível de log                      | `info`                    |
| `SLA_DEFAULT_HOURS` | SLA padrão em horas (steps)       | `24`                      |

---

## Documentação da API e testes manuais

- **OpenAPI:** [openapi.yaml](openapi.yaml) — especificação dos endpoints, schemas e códigos de erro.
- **Postman:** coleção em `postman/API-Workflow-InCicle.postman_collection.json` (variáveis: `base_url`, `X-Company-ID`, `X-User-ID`). Ver [postman/README.md](postman/README.md).

---

## Testes de carga (k6)

Scripts em `load-tests/`: `inbox.test.js`, `approve.test.js`, `timeline.test.js`. Relatório completo em **[LOAD_TEST.md](LOAD_TEST.md)** (throughput, latência p95, taxa de erro, gargalo e proposta de melhoria).

**Cenário:** rampa 30s, sustentação 2min, rampa 15s. Tudo pode rodar no Docker (sem instalar k6 no host):

```bash
# 1. Subir API e aplicar seed básico (se ainda não fez)
docker compose up -d --build && docker compose run --rm seed

# 2. Popular base para carga (10k instâncias; demora um pouco)
docker compose run --rm seed-load

# 3. Rodar k6 (use o perfil load)
docker compose --profile load run --rm k6 load-tests/inbox.test.js
docker compose --profile load run --rm k6 load-tests/approve.test.js
docker compose --profile load run --rm k6 load-tests/timeline.test.js
```

O container k6 usa a imagem oficial `grafana/k6` e acessa a API em `http://api:3000` na rede Docker. Alternativa: com k6 instalado no host, use `BASE_URL=http://localhost:3000` e `k6 run load-tests/inbox.test.js`.

---

## Entregáveis

| Entregável | Descrição |
|------------|-----------|
| [openapi.yaml](openapi.yaml) | Especificação OpenAPI 3 da API. |
| [LOAD_TEST.md](LOAD_TEST.md) | Relatório de testes de carga (k6): throughput, p95, taxa de erro, gargalo, melhorias. |
| [postman/](postman/) | Coleção Postman com todos os endpoints. |
| `docker-compose.yml` | API + PostgreSQL + Redis; one-off: seed, seed-load, test-unit, test-integration, test-e2e, k6. |
| `.env.example` | Variáveis de ambiente para reprodução. |
| Migrations | `src/infrastructure/database/migrations/` (TypeORM). |
| Seed | `docker compose run --rm seed` (básico); `docker compose run --rm seed-load` (10k instâncias para k6). |
| Scripts k6 | `load-tests/inbox.test.js`, `approve.test.js`, `timeline.test.js` (rodar via `docker compose --profile load run --rm k6 load-tests/...`). |

---

## Decisões técnicas e trade-offs

### Assíncrono / mensageria: BullMQ + Redis

A API usa **BullMQ** com **Redis** para filas (jobs de SLA, auditoria). Justificativa:

- **NestJS:** integração nativa com `@nestjs/bullmq`; menos boilerplate que adaptadores para RabbitMQ/Kafka.
- **Operação:** um único broker (Redis); menos dependências para ambiente de avaliação.
- **Latência:** para volumes moderados (SLA e auditoria), Redis é suficiente; Kafka/RabbitMQ são mais relevantes em throughput muito alto e retenção longa.
- **Trade-off:** em produção com alto volume de eventos ou necessidade de replay em log imutável, Kafka poderia ser considerado.

### Teste concorrente (N=20) no E2E

O cenário E2E de **corrida concorrente** envia **N=20** requisições paralelas de approve no mesmo step (regra ANY). Objetivo: garantir que apenas **uma** decisão é efetiva (idempotência e lock).

- **N=20** equilibra stress (concorrência real) e tempo de execução da suíte. Valores menores reduzem a chance de exercitar race; valores maiores alongam o teste sem ganho proporcional.
- O teste verifica que o número de votos no step é 1 e que a instância transita para o estado esperado.

---

## Estrutura do projeto

```
src/
├── domain/           # entidades, value objects, exceções, serviços de domínio
├── application/      # use cases, ports, adapters
├── infrastructure/  # TypeORM, migrations, seeds, BullMQ, health
└── presentation/    # controllers, DTOs, middleware (tenant), filters
test/                # unit, integration, e2e
load-tests/          # scripts k6
postman/             # coleção Postman
openapi.yaml         # especificação OpenAPI 3
```
