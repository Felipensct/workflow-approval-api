# Coleção Postman — API Workflow InCicle

Coleção para testes manuais de todos os endpoints da API.

## Como importar

1. Abra o Postman.
2. **Import** → **File** → selecione `API-Workflow-InCicle.postman_collection.json`.
3. A coleção aparecerá na barra lateral.

## Variáveis da coleção

| Variável       | Valor padrão (exemplo)                    | Uso |
|----------------|-------------------------------------------|-----|
| `base_url`     | `http://localhost:3000`                    | URL base da API. |
| `company_id`   | `c1000000-0000-4000-8000-000000000001`    | Header X-Company-ID (tenant). |
| `user_id`      | `c1000000-0000-4000-8000-000000000001`    | Header X-User-ID. |
| `template_id`  | _(vazio)_                                 | Preencher após criar template (ou usar id do seed). |
| `version_id`   | _(vazio)_                                 | Preencher após criar versão. |
| `instance_id`  | _(vazio)_                                 | Preencher após criar instância ou obter do Inbox. |
| `step_id`      | _(vazio)_                                 | Obter do GET Inbox para approve/reject. |
| `delegation_id`| _(vazio)_                                 | Preencher para DELETE delegação. |

Para alterar: clique na coleção → **Variables** e edite os valores.

## Fluxo sugerido (com seed)

1. **Health** → Liveness / Readiness (validar que a API está no ar).
2. **Templates** → Listar (se rodou seed, já existe template/versão); ou Criar template → Criar versão → Publicar versão (copiar `template_id` e `version_id` para as variáveis).
3. **Instances** → Criar instância (usar `version_id`) → Submeter instância (usar `instance_id` retornado).
4. **Approvals** → Inbox (copiar `instanceId` e `stepId` de um item para as variáveis) → Aprovar step ou Rejeitar step.
5. **Delegations** → Criar / Listar / Remover (opcional).
6. **Analytics** → SLA Compliance (com ou sem from/to).

## Endpoints incluídos

- **Health:** GET /health, GET /health/ready  
- **Templates:** GET/POST /v1/templates, GET /v1/templates/:id, POST versions, POST publish  
- **Instances:** GET/POST /v1/instances, GET /v1/instances/:id, POST submit, GET timeline  
- **Approvals:** GET inbox, POST approve, POST reject  
- **Delegations:** GET/POST /v1/delegations, GET active, DELETE /v1/delegations/:id  
- **Analytics:** GET /v1/analytics/sla-compliance  

Todos os endpoints (exceto Health) enviam os headers **X-Company-ID** e **X-User-ID** usando as variáveis da coleção.
