# OOPA

Sistema web mobile-first para uma ONG gerenciar caes, tutores, ocorrencias,
adocoes, equipe e auditoria.

Este repositorio contem apenas o scaffold inicial. Nenhuma funcionalidade de
produto foi implementada ainda.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4 + shadcn/ui
- Convex para backend, banco, auth, realtime e jobs
- Vitest + Testing Library para testes de unidade/componentes
- Playwright para testes end-to-end
- ESLint + Prettier para qualidade e consistencia

## Primeiros passos

```bash
npm install
npm run dev
```

Em outro terminal, rode o Convex quando for trabalhar no backend:

```bash
npm run dev:convex
```

O Convex ja foi configurado com deployment de desenvolvimento na nuvem. Se
precisar recriar a configuracao, rode:

```bash
npx convex dev --once --configure existing --team felipe-dresch --project oopa --dev-deployment cloud
```

## Qualidade

Antes de considerar qualquer tarefa concluida:

```bash
npm run quality
```

Esse comando executa lint, typecheck, testes com cobertura e build.

Comandos granulares:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

## Estrutura

```text
convex/              Backend Convex e tipos gerados
docs/                Documentacao de produto, arquitetura e qualidade
e2e/                 Testes Playwright
src/app/             Providers e composicao global
src/components/ui/   Componentes shadcn/ui versionados no repo
src/lib/             Utilitarios compartilhados
src/test/            Setup de testes
```

## Convex AI files

Os AI files oficiais do Convex foram instalados com:

```bash
npx convex ai-files install
```

Para atualizar:

```bash
npm run convex:ai-files
```

Ao trabalhar com Convex, leia `convex/_generated/ai/guidelines.md` antes de
alterar schema, queries, mutations, actions ou auth.

## Documentacao interna

- `docs/architecture.md`
- `docs/quality.md`
- `docs/product-brief.md`
- `docs/decisions/0001-foundation.md`
