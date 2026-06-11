# Arquitetura

## Principios

- Mobile-first, responsivo, sem app nativo e sem funcionamento offline.
- Uma ONG e uma cidade; nao desenhar multi-tenant ate existir requisito real.
- Convex e a unica camada backend: banco, queries, mutations, actions, auth,
  realtime e jobs.
- Frontend deve ser uma SPA Vite/React com shadcn/ui versionado no repositorio.
- Toda regra de permissao deve ser validada no backend, mesmo quando a UI ja
  esconder a acao.

## Camadas

```text
src/app             Composicao global, providers e bootstrap
src/components      Componentes reutilizaveis
src/components/ui   Componentes shadcn adicionados via CLI
src/lib             Utilitarios puros compartilhados
convex              Schema, queries, mutations, actions e jobs
docs                Decisoes e referencias de produto
e2e                 Fluxos Playwright
```

## Backend Convex

- Comecar cada area de dominio por schema e indices.
- Preferir validators Convex (`v.*`) em toda funcao publica.
- Separar queries, mutations e actions por dominio.
- Usar actions somente para integracoes externas ou trabalho nao transacional.
- Evitar consultas sem indice em telas de listagem e busca.

## Frontend

- Usar componentes shadcn existentes antes de criar UI customizada.
- Manter composicao simples e explicita; evitar abstracoes antes de duplicacao
  real.
- Fluxos sensiveis devem ter estados de carregamento, vazio, erro e permissao
  negada.

## Integracoes futuras

- Cloudflare R2 para fotos via URLs assinadas emitidas por Convex actions.
- Resend para convites e reset de senha.
- OCR na ultima etapa, atras de uma action Convex e sempre com confirmacao
  manual dos 15 digitos antes da busca.
