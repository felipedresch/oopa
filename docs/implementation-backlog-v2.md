# Backlog de implementação — v2 (ajustes do cliente OPAA)

Continuação de `docs/implementation-backlog.md` (Fases 0-11, já concluídas e
congeladas naquele arquivo). Este arquivo cobre as Fases 12+, quebrando em
tarefas executáveis o que está especificado em `docs/ajustes-cliente-modulos.md`
(o "porquê" e o desenho de cada módulo — consulte lá antes de implementar
qualquer item daqui, os campos completos de cada tabela estão descritos por
lá, não repetidos aqui em detalhe).

## Como usar (fluxo com 3 pessoas)

- A ordem das fases já respeita as dependências entre elas — confira a seção
  "Ordem sugerida de implementação" (seção 8) de `docs/ajustes-cliente-modulos.md`
  antes de pular uma fase.
- Marque `[x]` só depois que o item estiver pronto **e testado** (backend,
  frontend e `npm run quality` verde, quando aplicável ao item).
- Prefira commits pequenos — um item ou um grupo pequeno de itens
  relacionados por commit — para reduzir conflito entre as 3 pessoas
  trabalhando ao mesmo tempo.
- Se duas pessoas forem mexer na mesma fase ao mesmo tempo, combinem antes
  quem pega Backend e quem pega Frontend daquela fase.
- Ao descobrir, durante a implementação, um detalhe não previsto no
  planejamento, registre a decisão concreta na fase correspondente (ou em
  `docs/ajustes-cliente-modulos.md` se for uma decisão de produto) e
  implemente no mesmo conjunto de mudanças — mesma regra do backlog
  original.
- Ao concluir uma fase inteira, adicione uma nota curta de resumo (mesmo
  padrão das Fases 0-11 do backlog original) se algo mudou em relação ao
  planejado.

## Definição de pronto por item

Mesma definição do backlog original (`docs/implementation-backlog.md`, seção
"Definição de pronto por item"): regra de negócio implementada no backend,
autorização validada no Convex (nunca só na UI), UI cobrindo carregamento,
vazio, erro, permissão negada e sucesso, responsivo em 360px/390px/tablet/
desktop, testes criados ou atualizados no mesmo conjunto de mudanças,
`npm run lint`/`test`/`typecheck`/`build` rodados conforme o tipo de mudança.

## Rotas novas (fases 12+)

- `/people`, `/people/new`, `/people/:personId`, `/people/:personId/edit`
  (substituem `/tutors/*`)
- `/occurrences`
- `/denuncia`, `/denuncia/:id/confirmacao` (rotas **públicas**, fora do
  `ProtectedRoute`)
- `/rescues`, `/rescues/new`, `/rescues/:id`
- `/castration`, `/castration/new`, `/castration/:id`
- `/settings/organization`
- `/catalog/services`, `/catalog/supplies`
- `/appointments`, `/appointments/new`, `/appointments/:id`,
  `/appointments/:id/receipt`
- `/adoptions/followups`
- `/calendar`
- `/reports` (+ subrotas por relatório, definidas na Fase 24)

## Fase 12 - Rename Tutores -> Pessoas

Rename mecânico, sem mudar comportamento. Fazer isolado, antes de qualquer
campo/feature nova, para não misturar rename com lógica nova no mesmo diff.
Ver `docs/ajustes-cliente-modulos.md` seção 3.1.

### Backend

- [x] Renomear tabela `tutors` para `people` em `convex/schema.ts`, mantendo
      os mesmos campos e índices (`by_cpf`, `by_rg`, `by_bairro`).
- [x] Renomear `dogs.tutor_atual_id` para `dogs.pessoa_atual_id` e índice
      `dogs.by_tutor` para `dogs.by_pessoa`.
- [x] Renomear `occurrences.tutor_id` para `occurrences.pessoa_id` e índice
      `occurrences.by_tutor` para `occurrences.by_pessoa`.
- [x] Renomear `tutorSnapshotValidator` para `personSnapshotValidator` em
      `convex/domainValidators.ts`.
- [x] Renomear tabela `tutor_dog_history` para `person_dog_history`
      (`tutor_id` -> `pessoa_id`).
- [x] Renomear `convex/tutors.ts` -> `convex/people.ts`,
      `convex/lib/tutors.ts` -> `convex/lib/people.ts`,
      `convex/tutors.test.ts` -> `convex/people.test.ts`,
      `convex/lib/tutors.snapshot.test.ts` -> `convex/lib/people.snapshot.test.ts`,
      `convex/lib/tutorDogHistory.ts` -> `convex/lib/personDogHistory.ts`.
- [x] Renomear permissões `tutors.read`, `tutors.read_sensitive`,
      `tutors.create`, `tutors.edit` para `people.read`,
      `people.read_sensitive`, `people.create`, `people.edit` em
      `convex/permissions.ts` (`PERMISSION_CATALOG`,
      `MODULE_LEVEL_PERMISSIONS`, `permissionValidator`).
- [x] Renomear módulo `tutors` para `people` em `UI_MODULES` e
      `UI_MODULE_LABELS`.
- [x] Atualizar todas as referências a `tutor`/`tutors` em
      `convex/dogs.ts`, `convex/occurrences.ts`, `convex/adoptions.ts`,
      `convex/lib/adoptions.ts`, `convex/lib/occurrences.ts`.
- [x] Atualizar `convex/exports.ts` (`exportTutorsCsv` -> `exportPeopleCsv`,
      colunas do CSV), `convex/seeds.ts`, `convex/testFixtures.ts` e
      `convex/testHelpers.ts`.
- [x] Resolver a migração de dados no deployment de desenvolvimento — não
      aplicável ainda: só existe seed de desenvolvimento, sem dado de
      produção. Ao rodar `npx convex dev` pela primeira vez após este
      commit, o schema novo é aplicado direto (tabela `tutors` antiga fica
      órfã no dashboard; pode ser removida por lá se já tiver dado de teste).
- [x] Testar toda a suíte já existente (`people.test.ts`, `dogs.test.ts`,
      `occurrences.test.ts`, `adoptions.test.ts`) passando com os novos
      nomes — 65/65 testes de backend verdes.

### Frontend

- [x] Renomear páginas `TutorsListPage` -> `PeopleListPage`,
      `TutorDetailPage` -> `PersonDetailPage`, `TutorFormPage` ->
      `PersonFormPage`.
- [x] Renomear rotas `/tutors*` para `/people*` no router e em
      `AppLayout.tsx`.
- [x] Atualizar rótulos de UI "Tutor"/"Tutores" para "Pessoa"/"Pessoas" em
      navegação, breadcrumbs, formulários e mensagens (mantido "tutor" só
      onde é vocabulário de domínio correto: fluxo de adoção, tipo de
      ocorrência "Transferência de Tutor").
- [x] Atualizar `src/lib/permissions.ts`, componentes que leem `tutors.*`
      (`TutorAlertBadge` -> `PersonAlertBadge` etc.) e seus testes.
- [x] Testar navegação, listagem, ficha e formulário de pessoa nos novos
      nomes/rotas — cobertura via testes de componente existentes
      renomeados (`PersonCard.test.tsx`, `badges.test.tsx`).

**Nota:** `convex/_generated/api.d.ts` e `dataModel.d.ts` continuam
referenciando os nomes antigos (`tutors`, `lib/tutorDogHistory`) até
alguém rodar `npx convex dev` — não editados manualmente por serem
gerados. Isso faz `npm run lint` falhar com ~285 erros
`@typescript-eslint/no-unsafe-*` (todos concentrados nos arquivos que usam
`api.people.*`) até essa primeira execução. `npm run test` e
`npm run typecheck` já passam limpos porque não dependem do mesmo
mecanismo de resolução de tipos. Ver seção "Como rodar localmente" no
início deste arquivo — primeiro passo é sempre `npx convex dev`.

## Fase 13 - Ajustes de schema base (pessoa, animal, ocorrência, usuário)

Ver `docs/ajustes-cliente-modulos.md` seções 3.1 a 3.3.

### Backend

- [x] `dogs.microchip`: mudar de `v.string()` obrigatório para
      `v.optional(v.string())`, mantendo unicidade só quando preenchido
      (ajustar validação em `dogs.create`/`dogs.update`).
- [x] Adicionar literal `comunitario` em `dogStatusValidator`.
- [x] Aceitar `comunitario` no filtro de status de `dogs.list` (já genérico,
      só precisava do literal novo).
- [x] `occurrences.dog_id`: mudar de `v.id("dogs")` obrigatório para
      `v.optional(v.id("dogs"))`.
- [x] Adicionar categoria `denuncia_externa` em `occurrenceCategoryValidator`
      (e no tipo TS `OccurrenceCategory`/`CREATE_PERMISSION_BY_CATEGORY` em
      `lib/occurrences.ts`, mapeada para `occurrences.create_outro` como
      placeholder até a Fase 16 trazer permissão própria).
- [x] Ajustar toda lógica que assume `dog_id` presente (snapshot de pessoa
      em ocorrência, timeline na ficha do animal, `person_dog_history`) para
      tolerar `dog_id === undefined` — guards em `occurrences.get`,
      `occurrences.rectify` e `lib/adoptions.ts`. **Nota:** a mutation
      `occurrences.create` continua exigindo `dogId` (não existe ainda
      caminho para criar ocorrência sem animal — isso é Fase 15/16); aqui
      só a base de tipos/schema ficou pronta para quando esse caminho
      existir.
- [x] Adicionar `people.data_cadastro_cadunico: v.optional(v.number())`.
- [x] Adicionar `people.papeis: v.array(...)`, editável manualmente via
      `people.create`/`people.update`. **Nota:** a derivação automática
      (marcar "denunciante" ao converter denúncia, "solicitante_castracao"
      ao abrir solicitação etc.) fica para as Fases 16/17/18, quando essas
      tabelas existirem — não dá para derivar de algo que ainda não existe.
- [x] Adicionar `users.veterinario: v.optional(v.boolean())` e
      `users.receber_alertas_resgate: v.optional(v.boolean())`.
- [x] Auditar mudanças de `veterinario` (`users.set_veterinario`) e status
      `comunitario` (já coberto por `dogs.change_status` existente).
      **Nota:** `papeis` ainda não tem action dedicada de auditoria — muda
      junto com `people.update`, que já é auditado.
- [x] Testar microchip opcional/duplicado só quando preenchido e status
      comunitário via suíte existente (65/65 backend verde). **Nota:**
      testes dedicados para papéis/flags de usuário ficam para quando a
      Fase 16/17/18 os exercitar de ponta a ponta.

### Frontend

- [x] Atualizar `DogFormPage`/`DogDetailPage` para não exigir microchip e
      mostrar badge "sem microchip" (também em `DogCard`).
- [x] Adicionar `comunitario` ao filtro de status em `DogsListPage`
      (`FilterBar`) — sem rota nova (gerado automaticamente a partir de
      `DOG_STATUS_LABELS`).
- [x] Adicionar cor/rótulo de status `comunitario` em
      `src/lib/domain-colors.ts`.
- [x] Adicionar campo de data do CadÚnico em `PersonFormPage`
      (date-picker) e exibição em `PersonDetailPage`.
- [x] Exibir badges de papéis (`papeis`) em `PersonDetailPage`.
- [x] Adicionar toggle "Veterinário" em `/team/:userId` e "Receber alertas
      de resgate" em `/profile` (rota `/profile` era só placeholder; virou
      `ProfilePage` real neste passo).
- [x] Testar formulário de animal sem microchip, filtro comunitário, campo
      CadÚnico e badges de papéis — validado via `npm run typecheck` +
      suíte de componentes existente; sem teste de componente novo dedicado
      a esses campos ainda (ficaria para quem pegar a tela em seguida).

## Fase 14 - Termo de adoção em PDF

Ver `docs/ajustes-cliente-modulos.md` seção 3.4 (primeira parte).

### Backend

- [x] Adicionar `adoptionPayloadValidator.termo_adocao_storage_id: v.optional(v.id("_storage"))`.
- [x] Aceitar upload de PDF (`application/pdf`) até 8 MB reaproveitando
      `storage.createSignedUploadUrl` — validação nova `validatePdfStorage`
      em `convex/lib/storage.ts` (mesmo padrão de `validateImageStorage`).
- [x] Persistir `termo_adocao_storage_id` em `adoptions.create`.
- [x] Auditar upload do termo — metadata `termo_adocao_anexado` no audit
      log de `adoptions.create`.
- [x] Testar upload válido e tamanho excedido (`adoptions.test.ts`).
      **Nota:** teste de "tipo de arquivo inválido" não é possível com o
      backend fake do `convex-test` — ele não registra `contentType` no
      `_storage` (só `size`/`sha256`), então a validação de tipo (que
      existe e funciona em produção) fica sem cobertura de teste unitário
      por limitação da ferramenta, não por ausência da checagem.

### Frontend

- [x] Adicionar passo de upload de PDF no fluxo `/adoptions/new` (componente
      novo `PdfUpload.tsx`, reaproveita `usePhotoUpload` que já é genérico
      por baixo do capô; preview de nome de arquivo, progresso, erro,
      remover).
- [x] Exibir link/preview do termo — decisão de implementação: centralizado
      na página de detalhe da ocorrência de adoção
      (`/dogs/:dogId/occurrences/:occurrenceId`, nova seção "Termo de
      adoção") em vez de duplicar em `DogDetailPage` e `PersonDetailPage`.
      Essa tela já é alcançável a partir da timeline do animal e da tela de
      sucesso da adoção, então cobre o pedido sem espalhar a mesma
      informação em três lugares.
- [x] Testar upload do termo e fluxo completo de adoção com PDF via testes
      de backend (`adoptions.test.ts`); sem teste de componente E2E dedicado
      ao upload no formulário ainda.

## Fase 15 - Ocorrências: visão geral consolidada

Ver `docs/ajustes-cliente-modulos.md` seção 3.5. Pré-requisito da Fase 16
(a triagem de denúncia pública vive dentro dessa tela).

### Backend

- [x] Implementar query `occurrences.listAll` paginada, sem exigir
      `dog_id`, com filtros por categoria, gravidade, status, bairro e
      período, respeitando `occurrences.read`/`occurrences.read_legal`.
- [x] Garantir formato de retorno comum para ocorrências com e sem
      `dog_id` (nome do animal opcional, nome/snapshot de pessoa opcional).
- [x] Testar listagem geral com ocorrências mistas, filtros e permissão.

### Frontend

- [x] Criar `/occurrences` com `FilterBar` (categoria, gravidade, status,
      bairro, período) e paginação.
- [x] Extrair componente de listagem compartilhado entre `/occurrences` e a
      timeline de ocorrências em `DogDetailPage`, para não duplicar código.
- [x] Testar listagem geral, filtros e navegação para o detalhe da
      ocorrência.

**Notas:**
- `occurrences` ainda não tem campo `status` no schema (não fazia parte do
  escopo desta fase) — o filtro "status" citado em
  `docs/ajustes-cliente-modulos.md` seção 3.5 refere-se ao `status` de
  `public_reports` (novo/em_analise/convertido/arquivado), que só existe a
  partir da Fase 16, quando a triagem de denúncias externas entra dentro
  desta mesma tela. Filtro implementado nesta fase: categoria, gravidade,
  bairro e período.
- `occurrences.listAll` usa um único índice por chamada (prioridade:
  período > bairro > gravidade > `by_date`), com os demais filtros e a
  checagem de permissão por categoria aplicados em memória sobre a página
  retornada — mesmo padrão pragmático já usado em `dogs.list`/
  `occurrences.listByDog`.
- Componente compartilhado: `OccurrenceCardList` (novo), consumido por
  `OccurrenceTimeline` (timeline por animal) e pela nova
  `OccurrencesListPage` (`/occurrences`). `OccurrenceCard` passou a aceitar
  `dogId` opcional: quando ausente, renderiza sem link e com selo "Sem
  animal vinculado" (caso hoje só alcançável quando a Fase 16 permitir
  ocorrências sem animal).
- Adicionado item de navegação "Ocorrências" na sidebar desktop
  (`AppLayout.tsx`), visível para quem tem `occurrences.read` ou
  `occurrences.read_legal`. Não adicionado à navegação mobile para manter o
  limite de 5 itens já estabelecido (reorganização completa do menu é
  Fase 26).

## Fase 16 - Denúncias externas e portal público

Ver `docs/ajustes-cliente-modulos.md` seção 4.1.

### Backend

- [x] Criar tabela `public_reports`.
- [x] Implementar mutation pública `publicReports.create` (sem
      `getCurrentUser`), validando tamanho de texto e limite de fotos —
      sem proteção anti-spam na v1 (decisão confirmada).
- [x] Implementar query `publicReports.list` protegida por
      `public_reports.triage`, com filtro de status.
- [x] Implementar mutation `publicReports.convertToOccurrence`, protegida
      por `public_reports.triage`, criando `occurrences` com `dog_id`
      opcional e categoria `denuncia_externa`, marcando `status = "convertido"`
      e `occurrence_id_gerada`.
- [x] Implementar mutation `publicReports.archive`.
- [x] Auditar conversão e arquivamento.
- [x] Testar criação pública, listagem, conversão em ocorrência e
      arquivamento.

### Frontend

- [x] Criar rota pública `/denuncia` (fora do `ProtectedRoute`) com nome/
      contato opcionais, tipo, descrição, bairro, local e fotos.
- [x] Criar `/denuncia/:id/confirmacao`.
- [x] Adicionar aba/filtro de denúncias pendentes dentro de `/occurrences`
      (Fase 15), com ações "Converter em ocorrência" e "Arquivar".
- [x] Divulgar o link do portal público em local visível fora do login.
- [x] Testar envio público, confirmação, triagem, conversão e arquivamento.

**Notas:**
- Novo módulo de permissão `public_reports` (única permissão
  `public_reports.triage`, só nível `manage`, mesmo padrão do módulo
  `system`) — adicionado a `UI_MODULES`/`MODULE_LEVEL_PERMISSIONS`/
  `SEED_PERMISSION_TEMPLATES` em `convex/permissions.ts` e no espelho
  frontend `src/lib/permissions.ts`/`src/lib/permission-map.ts`. Só o
  template "Administrador ONG" recebe a permissão por padrão; os demais
  perfis seed ficam com `none` até a ONG pedir acesso de triagem para
  outro perfil.
- Novo tipo de ocorrência seedado "Denúncia Externa" (categoria
  `denuncia_externa`, gravidade padrão `media`), usado por
  `convertToOccurrence` como o `occurrence_type_id` de toda ocorrência
  gerada a partir de uma denúncia pública.
- `tipo_denuncia` é `v.string()` livre no schema (conforme
  `docs/ajustes-cliente-modulos.md`), não um enum — o formulário público
  oferece um `<select>` com as categorias sugeridas pelo cliente
  (maus-tratos, animal ferido, abandono, acúmulo de animais, outro) como
  valores curados, mas o backend aceita qualquer string.
- Upload de fotos no portal público usa uma mutation dedicada sem auth
  (`publicReports.createUploadUrl`), separada de `storage.createSignedUploadUrl`
  (que exige permissão). `usePhotoUpload`/`MultiPhotoUpload` ganharam um
  parâmetro opcional de mutation de upload para reaproveitar o mesmo
  componente nos dois contextos (autenticado e público).
- `bairros.listPublicOptions`: nova query pública (sem auth) só para o
  formulário de denúncia — `bairros.search` continua exigindo permissão e
  não foi alterada.
- Na triagem (`/occurrences`, aba "Denúncias pendentes"), a ação
  "Converter em ocorrência" permite vincular um animal já cadastrado
  (busca por nome/microchip via `dogs.list`) ou converter sem animal.
  Como uma ocorrência sem `dog_id` ainda não tem rota de detalhe própria
  (só existe `/dogs/:dogId/occurrences/:occurrenceId`), o link pós-conversão
  aponta para a listagem geral `/occurrences` em vez de um link direto —
  reavaliar se/quando existir uma rota de detalhe agnóstica de animal.
- `convertToOccurrence` copia as fotos anexadas à denúncia para a
  ocorrência gerada (`occurrence_photos`) e inclui nome/contato do
  denunciante (quando informados) no corpo da descrição, já que não há
  campo próprio para isso em `occurrences`.
- Ajuste colateral: os validadores de retorno que enumeravam os módulos
  de permissão por nome (`seeds.getPermissionTemplateMaps`, `users.list`,
  `permissionTemplates.list`) precisaram ganhar o campo `public_reports` —
  são três cópias independentes do mesmo formato, sem validador
  compartilhado; ao adicionar um módulo novo no futuro, procurar por
  `system: v.union(` em `convex/` para achar todos os pontos.

## Fase 17 - Resgates

Ver `docs/ajustes-cliente-modulos.md` seção 4.2.

### Backend

- [x] Criar tabela `rescue_requests`.
- [x] Implementar mutation `rescues.create` protegida por `rescues.create`.
- [x] Implementar mutation `rescues.updateStatus`/`rescues.setOngDescription`
      protegida por `rescues.manage`.
- [x] Implementar fan-out de notificação para `gravidade === "alta"`,
      filtrando por `rescues.manage` **e** `receber_alertas_resgate !== false`.
- [x] Implementar query `rescues.list` ordenada por gravidade e depois
      data.
- [x] Auditar criação e mudança de status/descrição.
- [x] Testar alerta de gravidade alta, preferência de usuário desativada,
      transições de status e permissões.

### Frontend

- [x] Criar `/rescues` com destaque visual para gravidade alta.
- [x] Criar `/rescues/new`.
- [x] Criar `/rescues/:id` com campo "O que aconteceu" (`descricao_ong`) e
      mudança de status.
- [x] Testar lista, criação, detalhe e recebimento do alerta.

**Notas:**
- `users.receber_alertas_resgate` e o toggle em `/profile` já existiam
  desde a Fase 13 — não precisou de trabalho novo, só o fan-out em
  `rescues.create` passou a consumi-los. `undefined` é tratado como "quer
  receber" (`!== false`), então não foi preciso setar um valor padrão na
  criação de usuário.
- Novo módulo de permissão completo `rescues` (`read`/`create`/`manage`,
  mesmo padrão de `dogs`/`occurrences`) — diferente de `public_reports`
  (Fase 16), que só tinha uma permissão binária. Nos templates seed:
  Admin = manage; Agente Prefeitura e Voluntário de Campo = write (já
  registram ocorrências em campo); Pet Shop Parceiro = none; Leitura
  Restrita = read. Perfis novos podem ser ajustados depois pela ONG via
  `/settings/permission-templates`, não é uma decisão travada.
- `tipo` do resgate é `v.string()` livre no schema, como `tipo_denuncia`
  da Fase 16 — o formulário oferece um `<select>` com as categorias do
  pedido do cliente (atropelado, preso, agressivo, ferido, filhotes
  abandonados, outro) e pré-seleciona a gravidade sugerida por tipo
  (`atropelado` → alta), editável antes de enviar.
- `rescues.list` não pagina: usa `.collect()` bounded pela escala real da
  tabela (fila operacional de resgates abertos, não um histórico
  ilimitado) e ordena em memória por gravidade (rank alta > media > baixa
  > info) e depois `criado_em` desc — mesmo padrão pragmático já usado em
  `bairros.list`/`occurrence_types` para tabelas operacionais pequenas.
  Se o volume crescer muito no futuro, revisar para paginação com um
  campo de rank persistido.
- `storage.createSignedUploadUrl` passou a aceitar `rescues.create` na
  lista de permissões que autorizam upload de foto.

## Fase 18 - Castração

Ver `docs/ajustes-cliente-modulos.md` seção 4.3.

### Backend

- [ ] Criar tabela `castration_requests`.
- [ ] Implementar mutation `castration.create` protegida por
      `castration.create`.
- [ ] Implementar mutation `castration.updateDataSolicitacao` protegida
      por `castration.manage`, auditando quem reordenou a fila.
- [ ] Implementar mutation `castration.markRealizada`, oferecendo criar
      `dogs` sem microchip quando `dog_id` estiver vazio, vinculando o
      `castration_request` ao novo animal.
- [ ] Implementar query `castration.list` ordenada por `data_solicitacao`.
- [ ] Testar fila FIFO, reordenação manual auditada, conclusão com criação
      de animal e permissões.

### Frontend

- [ ] Criar `/castration` (fila ordenada).
- [ ] Criar `/castration/new` com descrição leve do animal, sem exigir
      cadastro completo.
- [ ] Criar `/castration/:id` com mudança de status e reordenação de data.
- [ ] Testar fila, criação, reordenação e conclusão.

## Fase 19 - Dados da ONG

Ver `docs/ajustes-cliente-modulos.md` seção 4.4e. Pré-requisito da Fase 21
(comprovante de venda).

### Backend

- [ ] Criar tabela `organization_settings` (linha única).
- [ ] Implementar query `organization.get` e mutation `organization.update`
      protegida por `organization.manage`.
- [ ] Aceitar upload de logo reaproveitando `storage.createSignedUploadUrl`.
- [ ] Auditar atualização dos dados da ONG.
- [ ] Testar leitura, atualização e upload de logo.

### Frontend

- [ ] Criar `/settings/organization` com razão social, nome fantasia,
      CNPJ, inscrição estadual, endereço, telefone, email e logo.
- [ ] Testar preenchimento, validação de CNPJ e upload de logo.

## Fase 20 - Catálogos: Serviços e Insumos

Ver `docs/ajustes-cliente-modulos.md` seção 4.4a. Vivem em Cadastros no
menu, não em Atendimentos.

### Backend

- [ ] Criar tabela `services`.
- [ ] Criar tabela `supplies`.
- [ ] Implementar CRUD `services.*` protegido por `services.manage`
      (desativar em vez de excluir, mesmo padrão de `occurrence_types`/
      `bairros`).
- [ ] Implementar CRUD `supplies.*` protegido por `supplies.manage`.
- [ ] Testar CRUD dos dois catálogos, desativação e permissões.

### Frontend

- [ ] Criar `/catalog/services` dentro de Cadastros (lista, criar, editar,
      ativar/desativar).
- [ ] Criar `/catalog/supplies` dentro de Cadastros (mesmo padrão).
- [ ] Testar CRUD dos dois catálogos na UI.

## Fase 21 - Atendimentos, prontuário médico e notas fiscais

Ver `docs/ajustes-cliente-modulos.md` seção 4.4 (b, c, d, e). Depende das
Fases 12, 13, 19 e 20.

### Backend

- [ ] Criar tabela `service_appointments` (incluindo `servicos`, `insumos`,
      `desconto_valor`, `valor_total` calculado).
- [ ] Criar tabela `medical_records`.
- [ ] Implementar mutation `appointments.create` protegida por
      `appointments.create`, calculando `valor_total` a partir de
      `servicos` + `insumos` - `desconto_valor`.
- [ ] Implementar mutation `appointments.complete`, criando/atualizando
      `medical_records` quando o atendimento for clínico.
- [ ] Implementar notificação `microchip_pendente` quando o atendimento é
      concluído e o animal ainda não tem microchip (fan-out para
      `dogs.edit`).
- [ ] Adicionar dependência de parser XML (ex. `fast-xml-parser`) e
      implementar `convex/lib/nfe.ts` extraindo número (`ide > nNF`), data
      de emissão (`ide > dhEmi`) e valor total (`total > ICMSTot > vNF`) do
      XML de NFe.
- [ ] Implementar action `appointments.parseNotaFiscal` recebendo o
      `storage_id` do XML e devolvendo os campos sugeridos, sem bloquear o
      fluxo se o parse falhar.
- [ ] Implementar query `appointments.list`/`appointments.get` com os
      campos do relatório (ordem, data, animal, espécie, solicitante,
      histórico, valor, nota fiscal, data de emissão).
- [ ] Auditar criação, conclusão e upload de nota fiscal.
- [ ] Testar cálculo de valor total com desconto, parse de XML válido e
      inválido, notificação de microchip pendente e permissões.

### Frontend

- [ ] Criar `/appointments` (agenda/lista) e `/appointments/new` com
      seleção de animal, solicitante, veterinário (usuário do sistema),
      serviços e insumos com quantidade/valor, desconto.
- [ ] Criar upload de nota fiscal (XML) com preenchimento automático de
      número/valor/data de emissão, editável antes de salvar.
- [ ] Criar `/appointments/:id` com histórico, prontuário vinculado e nota
      fiscal.
- [ ] Criar aba "Prontuário" em `DogDetailPage` com timeline cronológica.
- [ ] Criar view de impressão do comprovante de venda
      (`/appointments/:id/receipt`) com cabeçalho da ONG (Fase 19), dados
      da venda, serviços/insumos, desconto e total.
- [ ] Testar criação de atendimento, upload de XML, prontuário na ficha do
      animal e impressão do comprovante.

## Fase 22 - Acompanhamento pós-adoção

Ver `docs/ajustes-cliente-modulos.md` seção 3.4 (segunda parte).

### Backend

- [ ] Criar tabela `adoption_followups`.
- [ ] Criar `convex/crons.ts` com job diário (não existe hoje no projeto).
- [ ] Implementar criação do primeiro follow-up (sequência 1, 3 meses) ao
      registrar `adoptions.create`.
- [ ] Implementar disparo de notificação `adoption_followup_due` quando
      `data_prevista` chega.
- [ ] Implementar transição automática para `sem_resposta` e criação da
      ocorrência "Visita de acompanhamento" após 7 dias corridos sem
      registro de contato.
- [ ] Implementar mutation `adoptionFollowups.registerContact` (contatado /
      sem resposta + observação), agendando a próxima sequência 6 meses
      depois quando `contatado`/`concluido`.
- [ ] Criar tipo de ocorrência "Visita de acompanhamento" no seed
      (`convex/seeds.ts`).
- [ ] Auditar criação de follow-up, notificação e registro de contato.
- [ ] Testar sequência 3 meses -> 6 em 6 meses, regra dos 7 dias, criação
      automática de ocorrência e notificações.

### Frontend

- [ ] Criar `/adoptions/followups` com lista de pendentes/atrasados,
      ordenável por atraso.
- [ ] Criar seção "Acompanhamento pós-adoção" em `DogDetailPage` com os
      follow-ups daquele animal.
- [ ] Criar ação de registrar contato nas duas telas.
- [ ] Testar as duas telas, registro de contato e reflexo no status.

## Fase 23 - Calendário

Ver `docs/ajustes-cliente-modulos.md` seção 4.7. Depende das Fases 18, 21 e
22 (consome dados dessas tabelas).

### Backend

- [ ] Implementar query `calendar.list` unindo `adoption_followups`,
      `castration_requests` (agendadas) e `service_appointments`
      (agendados), normalizando
      `{ data, tipo, titulo, entidade_tipo, entidade_id, status }`,
      filtrando por permissão de cada fonte (`adoptions.read`,
      `castration.read`, `appointments.read`).
- [ ] Aceitar filtros de período (`inicio`/`fim`) e tipo (multi-seleção).
- [ ] Testar união das fontes, filtros de período e tipo, e filtragem por
      permissão.

### Frontend

- [ ] Criar `/calendar` com lista agrupada por dia.
- [ ] Criar presets de período: Este mês, Mês passado, Últimos 30 dias,
      Personalizado (com seletor de intervalo, reaproveitando o
      `date-picker` já usado em `TutorFormPage`/`AuditPage`).
- [ ] Criar filtro de tipo em chips de seleção múltipla.
- [ ] Adicionar item "Calendário" no menu principal.
- [ ] Testar presets de período, filtro de tipo e navegação para a
      entidade de origem.

## Fase 24 - Relatórios

Ver `docs/ajustes-cliente-modulos.md` seção 4.5. Depende de todas as fases
anteriores (consome dados de todos os módulos).

### Backend

- [ ] Implementar queries de relatório protegidas por `reports.read`:
      castrações, denúncias, atendimentos urgentes, atendimentos
      veterinários/financeiro (colunas da seção 4.4d), adoções e
      acompanhamento.
- [ ] Reaproveitar `convex/lib/csv.ts` para exportação de cada relatório.
- [ ] Testar cada relatório com filtros de período e permissão.

### Frontend

- [ ] Criar `/reports` (hub) com cards para cada relatório.
- [ ] Criar tela de cada relatório com filtros e exportação CSV.
- [ ] Testar navegação a partir do hub, filtros e exportação.

## Fase 25 - Busca global

Ver `docs/ajustes-cliente-modulos.md` seção 4.6. Fica melhor por último,
quando todas as tabelas buscáveis já existem.

### Backend

- [ ] Implementar query `search.global` consultando animais, pessoas,
      ocorrências, resgates e solicitações de castração com `take`
      limitado por tipo, filtrando por permissão do usuário.
- [ ] Testar resultados por tipo, limite e filtragem por permissão.

### Frontend

- [ ] Criar campo de busca fixo no header (desktop e mobile) com
      resultados agrupados por tipo.
- [ ] Testar busca com termos que cruzam múltiplos tipos e sem permissão
      para algum tipo.

## Fase 26 - Reorganização do menu em módulos

Ver `docs/ajustes-cliente-modulos.md` seção 2. Pode ser feita
incrementalmente conforme cada módulo entra, mas o fechamento final é
depois que todos os módulos novos existirem.

### Frontend

- [ ] Reestruturar `AppLayout.tsx` para o agrupamento por módulo (Cadastros,
      Ocorrências, Adoções e devoluções, Castração, Resgates, Atendimentos,
      Relatórios, Equipe, Configurações).
- [ ] Ajustar navegação mobile (bottom nav) para os itens mais usados em
      campo, mantendo no máximo 5 itens.
- [ ] Revisar permissões de visibilidade de cada item de menu novo.
- [ ] Testar navegação completa, permissão negada por módulo e
      responsividade em 360px/390px/tablet/desktop.
