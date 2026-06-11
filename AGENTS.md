# AGENTES.md

## Regras do projeto

- Sempre rode `npm run lint` antes de considerar uma tarefa concluida.
- Sempre rode `npm run test` antes de considerar uma tarefa concluida.
- Para mudancas de TypeScript, rode tambem `npm run typecheck`.
- Para mudancas que afetam build, bundling, CSS global ou dependencias, rode
  `npm run build`.
- Preferencialmente rode `npm run quality`, que agrega lint, typecheck, testes e
  build.
- Ao implementar qualquer tarefa, crie ou atualize os testes correspondentes no
  mesmo conjunto de mudancas.
- Mantenha testes existentes atualizados quando comportamento, contrato ou UI
  mudarem.
- Sempre atualize `docs/implementation-backlog.md` no mesmo conjunto de
  mudancas quando uma tarefa concluir, alterar, adicionar ou remover itens de implementacao, fluxos, contratos, permissoes, telas, testes ou decisoes relevantes.
- Preze por codigo simples, legivel, performatico e seguro.
- Valide autorizacao e permissoes no backend Convex; controles de UI nunca sao
  suficientes como barreira de seguranca.
- Nao coloque segredos, tokens ou credenciais no repositorio.
- Nao edite manualmente arquivos gerados em `convex/_generated`, exceto os AI
  files gerenciados pelo CLI Convex quando o comando oficial fizer isso.
- Antes de trabalhar em codigo Convex, leia
  `convex/_generated/ai/guidelines.md`.
- Use shadcn/ui via CLI e mantenha componentes adicionados em
  `src/components/ui`.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
