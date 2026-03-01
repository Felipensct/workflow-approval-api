# API Workflow InCicle

API de workflow de aprovações corporativas para ambiente multiempresa (desafio técnico InCicle).

---

## 1.1 Instalação do ambiente (Fedora)

Estas instruções consideram um **Fedora atualizado** sem Node.js, Docker, Git ou k6 instalados. Execute os comandos na ordem indicada.

### Git

```bash
sudo dnf install -y git
git --version
```

### Node.js 20 LTS

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

Adicione o repositório Docker. A sintaxe depende da versão do DNF:

- **Fedora 41+ (DNF 5)** — use:
  ```bash
  sudo dnf config-manager addrepo --from-repofile=https://download.docker.com/linux/fedora/docker-ce.repo
  ```
- **Fedora 40 ou anterior (DNF 4)** — use:
  ```bash
  sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
  ```

Em seguida:

```bash
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
```

Faça **logout e login** (ou execute `newgrp docker`) para o grupo `docker` passar a valer. Depois confira:

```bash
docker --version
docker compose version
```

**Erro "permission denied while trying to connect to the Docker API":** o usuário atual não está no grupo `docker` ou a sessão não recarregou o grupo. Soluções:
- **Opção 1:** abrir um **novo terminal** e rodar `newgrp docker` (ou fazer logout e login) e tentar de novo.
- **Opção 2:** usar sudo: `sudo docker compose up --build` (menos ideal; arquivos criados pelos containers podem ficar como root).

### k6 (testes de carga)

O k6 não vem nos repositórios padrão do Fedora. Adicione o repositório oficial do k6 e instale:

```bash
sudo dnf install -y https://dl.k6.io/rpm/repo.rpm
sudo dnf install -y k6
k6 version
```

Alternativa via Snap (se tiver Snap instalado): `sudo snap install k6`

---

## 1.2 Execução do projeto

Variáveis de ambiente são carregadas a partir de `.env`. Copie o exemplo e ajuste se necessário:

```bash
cp .env.example .env
```

### Com Docker Compose (recomendado)

Na raiz do projeto:

```bash
docker compose up --build
```

Se aparecer *permission denied* no Docker, veja a seção de instalação do Docker acima (grupo `docker` / `newgrp docker`).

A API sobe na porta 3000. As migrations rodam automaticamente no boot. Endpoints de saúde:

- **Liveness:** `GET http://localhost:3000/health`
- **Readiness:** `GET http://localhost:3000/health/ready` (verifica PostgreSQL e Redis)

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

### Seed (dados iniciais)

Após subir a API (com Docker ou local), rode o seed para popular 1 empresa, 3 membros do organograma, 1 template e 1 versão publicada (útil para testes manuais e e2e):

```bash
# Com Docker: rode dentro do container ou com variáveis apontando para o banco
npm run seed
```

Com Docker Compose em execução, use as mesmas variáveis do .env; o script conecta em `DB_HOST`/`DB_PORT` (localhost se o seed rodar na máquina e o Postgres estiver exposto em 5432).

### Rodando os testes

#### Testes unitários

```bash
npm run test:unit
```

#### Testes de integração

Requer PostgreSQL rodando (ex.: `docker compose up -d postgres`).

```bash
npm run test:integration
```

#### Testes E2E

Requer todos os serviços rodando (ex.: `docker compose up -d`), além do seed.

```bash
npm run seed
npm run test:e2e
```

### Seed de carga (testes de carga / k6)

Para base realista em testes de carga (ex.: k6), use o seed de carga: 2 empresas, ~100 usuários por empresa no organograma e 10.000 instâncias de workflow (40% pending, 30% approved, 20% rejected, 10% draft). Recomendável rodar com banco vazio ou dedicado, após as migrations.

```bash
npm run seed:load
```

### Testes de carga (k6)

Scripts em `load-tests/`: `inbox.test.js`, `approve.test.js`, `timeline.test.js`. Rodar após o seed de carga. Relatório e critérios em [LOAD_TEST.md](LOAD_TEST.md).

**Cenário:** rampa de subida 30s, sustentação 2min, rampa de descida 15s. Critérios de sucesso: `http_req_failed < 2%`, `http_req_duration` p95 &lt; 500 ms.

```bash
k6 run load-tests/inbox.test.js
k6 run load-tests/approve.test.js
k6 run load-tests/timeline.test.js
```

### Coleção Postman

Para testes manuais, importe a coleção em `postman/API-Workflow-InCicle.postman_collection.json`. Inclui todos os endpoints (templates, instances, approvals, delegations, analytics, health) e variáveis para `base_url`, `X-Company-ID` e `X-User-ID`. Ver [postman/README.md](postman/README.md).

### Estrutura de pastas (Etapa 1.2)

```
src/
├── domain/           # entidades e regras de negócio (a preencher na Etapa 2)
├── application/      # use cases (a preencher nas etapas 5+)
├── infrastructure/   # banco, filas, health
│   └── database/     # TypeORM, migrations, Redis health
└── presentation/    # controllers, DTOs
    └── health/       # GET /health e GET /health/ready
test/
├── unit/
├── integration/
└── e2e/
load-tests/
postman/             # Coleção Postman (API-Workflow-InCicle.postman_collection.json)
openapi.yaml         # Especificação OpenAPI 3 (endpoints, schemas, erros 400/409/422/503)
```

### Documentação e entregáveis

| Entregável | Descrição |
|------------|-----------|
| [openapi.yaml](openapi.yaml) | Especificação OpenAPI 3: endpoints, schemas, headers, códigos 400/409/422/503. Utilizável para geração de clientes ou import no Postman. |
| [LOAD_TEST.md](LOAD_TEST.md) | Relatório de testes de carga (k6): throughput, latência p95, taxa de erro, gargalos e melhorias sugeridas. |
| [postman/](postman/) | Coleção Postman com todos os endpoints e variáveis (base_url, X-Company-ID, X-User-ID). |
| `src/infrastructure/database/migrations/` | Migrations TypeORM (companies, org_chart, templates, instances, steps, votes, delegations, audit_logs, índices). |
| `npm run seed` | Seed básico (1 empresa, 3 membros, 1 template/versão) para testes manuais e E2E. |
| `npm run seed:load` | Seed de carga (2 empresas, 200 membros, 10k instâncias) para k6. |
| [load-tests/](load-tests/) | Scripts k6: inbox, approve, timeline. |

---

## Decisões técnicas

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

Após instalar tudo:

```bash
git --version && node -v && npm -v && docker --version && docker compose version && k6 version
```

Todos os comandos devem retornar versão sem erro.
