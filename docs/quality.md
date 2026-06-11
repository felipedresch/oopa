# Qualidade

## Regra de conclusao

Nenhuma tarefa deve ser considerada concluida sem:

1. Testes criados ou atualizados junto com a mudanca.
2. `npm run lint`
3. `npm run typecheck`
4. `npm run test`
5. `npm run build`

Use `npm run quality` para rodar o conjunto padrao.

## Testes

- Testes de componente ficam junto ao codigo: `src/**/*.test.tsx`.
- Testes E2E ficam em `e2e/`.
- Toda regra de negocio importante deve ter teste unitario ou de integracao no
  nivel mais baixo possivel.
- Fluxos criticos do produto devem ganhar cobertura E2E quando existirem:
  identificar cao, registrar ocorrencia, registrar adocao e convidar usuario.

## Lint e formatacao

- ESLint roda com `--max-warnings=0`.
- Prettier e a fonte da verdade para formatacao mecanica.
- Arquivos gerados pelo Convex em `convex/_generated` nao devem ser editados
  manualmente.

## Performance

- Listagens e buscas no Convex devem usar indices adequados.
- Evitar buscar documentos completos quando a tela so precisa de resumo.
- Componentes React devem manter estado local perto de onde e usado.

## Seguranca

- Permissoes sao obrigatorias no backend.
- Nao confiar em filtros ou controles da UI como autorizacao.
- Tokens, URLs assinadas e segredos devem ficar fora do repositorio.
- Dados sensiveis de tutores devem ter leitura explicitamente autorizada.
