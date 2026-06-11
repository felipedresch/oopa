# Backlog de implementacao

Fonte inicial: plano de produto colado pelo usuario em 2026-06-10, consolidado
com `docs/product-brief.md`, `docs/architecture.md` e `docs/quality.md`.

Este arquivo e a lista viva de execucao do produto. Sempre que uma tarefa de
codigo concluir, alterar, adicionar ou remover comportamento, contrato, fluxo,
schema, permissao, tela, teste ou decisao relevante, atualize este backlog no
mesmo conjunto de mudancas.

## Como usar

- Marque itens concluidos trocando `[ ]` por `[x]`.
- Execute os itens na ordem das fases, salvo dependencia tecnica explicita.
- Implemente as decisoes deste arquivo literalmente.
- Ao descobrir um detalhe inevitavel nao coberto aqui, acrescente a decisao
  concreta neste arquivo e implemente no mesmo conjunto de mudancas.
- Nao marque uma fase como concluida sem testes, validacoes de permissao no
  backend e estados de UI correspondentes.

## Decisoes sedimentadas para implementacao

- Convex e o unico backend. Nao criar API REST, servidor Express, Firebase,
  Supabase ou banco paralelo.
- Tabelas Convex usam nomes plurais em snake_case: `users`, `permission_templates`,
  `dogs`, `dog_photos`, `tutors`, `bairros`, `occurrence_types`, `occurrences`,
  `occurrence_photos`, `tutor_dog_history`, `notifications`, `audit_logs`.
- Arquivos Convex ficam por dominio: `convex/auth.ts`, `convex/users.ts`,
  `convex/permissions.ts`, `convex/dogs.ts`, `convex/tutors.ts`,
  `convex/bairros.ts`, `convex/occurrenceTypes.ts`, `convex/occurrences.ts`,
  `convex/adoptions.ts`, `convex/notifications.ts`, `convex/audit.ts`,
  `convex/storage.ts`, `convex/ocr.ts` e `convex/seeds.ts`.
- Funcoes publicas Convex usam nomes em camelCase e sempre recebem validators
  `v.*`.
- Erros de dominio usam estes codigos estaveis: `UNAUTHENTICATED`,
  `USER_INACTIVE`, `FORBIDDEN`, `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`,
  `TOKEN_EXPIRED`, `TOKEN_USED`, `UPLOAD_REJECTED`, `OCR_FAILED`.
- Auditoria usa tabela `audit_logs` com `actor_user_id`, `action`, `entity_type`,
  `entity_id`, `summary`, `metadata`, `created_at`. Mutations sensiveis chamam
  helper `recordAudit` no mesmo arquivo de dominio ou em `convex/audit.ts`.
- Dados sensiveis de tutor sao CPF, RG, endereco completo, telefone, email,
  data de nascimento, observacoes e alertas derivados.
- Permissoes sao fonte unica da verdade em `convex/permissions.ts`; a UI recebe
  apenas o mapa modulo/nivel e nunca salva papel abstrato no usuario.
- Email transacional usa Resend via Convex action para convite e reset de senha.
- Fotos usam Cloudflare R2 com URL assinada gerada por Convex action.
- OCR e implementado por action Convex. A imagem enviada ao OCR nao e persistida
  no banco; o sistema salva apenas microchip candidato, confianca, usuario,
  sucesso/falha e timestamp tecnico.
- Bairros sao geridos na tela Configuracoes > Bairros. Seed inicial cria
  `Centro`, `Zona Rural` e `Nao informado`; a ONG completa a lista pela UI.
- "Avisar a ONG" no cao nao encontrado cria notificacao in-app para usuarios
  com `dogs.create` e `dogs.read`.
- Auditoria tem exportacao CSV protegida por `system.audit_log`.
- Ficha/termo de adocao tem estes campos: `data_adocao`,
  `numero_termo_adocao`, `responsavel_ong_user_id`, `condicoes_adocao`,
  `observacoes_adocao`, `confirmou_documentos` e `confirmou_orientacoes`.
- Ocorrencia e imutavel depois de criada. Correcao sempre vira ocorrencia de
  tipo `Correcao/Retificacao` referenciando a ocorrencia original.
- Transferencia de tutor e implementada como ocorrencia de categoria `adocao`,
  com encerramento do historico anterior e abertura de novo historico.
- PWA tem manifest instalavel e icones, sem service worker offline.

## Rotas da aplicacao

- `/login`
- `/reset-password`
- `/reset-password/:token`
- `/accept-invite/:token`
- `/`
- `/identify`
- `/dogs`
- `/dogs/new`
- `/dogs/:dogId`
- `/dogs/:dogId/edit`
- `/dogs/:dogId/occurrences/new`
- `/tutors`
- `/tutors/new`
- `/tutors/:tutorId`
- `/tutors/:tutorId/edit`
- `/adoptions/new`
- `/returns/new`
- `/team`
- `/team/invite`
- `/team/:userId`
- `/settings`
- `/settings/permission-templates`
- `/settings/occurrence-types`
- `/settings/bairros`
- `/audit`
- `/notifications`
- `/profile`

## Definicao de pronto por item

- [ ] Regra de negocio implementada no backend para toda alteracao de dados.
- [ ] Autorizacao validada no Convex, nao apenas escondida na UI.
- [ ] UI cobre carregamento, vazio, erro, permissao negada e sucesso.
- [ ] Fluxo funciona em 360px, 390px, tablet e desktop sem sobreposicao ou texto
      cortado.
- [ ] Testes criados ou atualizados no mesmo conjunto de mudancas.
- [ ] `npm run lint` executado.
- [ ] `npm run test` executado.
- [ ] `npm run typecheck` executado para mudancas em TypeScript.
- [ ] `npm run build` executado para mudancas em build, bundling, CSS global ou
      dependencias.

## Fase 0 - Fundacao tecnica e alinhamento

### Backend

- [x] Inicializar Convex no projeto.
- [x] Instalar AI files oficiais do Convex.
- [x] Criar `convex/schema.ts` inicial.
- [x] Ler `convex/_generated/ai/guidelines.md` antes da primeira mudanca real
      em Convex.
- [x] Criar `convex/permissions.ts` com catalogo granular, modulos de UI,
      niveis de acesso e funcao de traducao modulo/nivel -> permissoes.
- [x] Criar `convex/audit.ts` com helper `recordAudit`, query protegida de
      auditoria e exportacao CSV.
- [x] Criar `convex/errors.ts` com codigos de erro sedimentados e helpers para
      `FORBIDDEN`, `NOT_FOUND`, `CONFLICT` e `VALIDATION_ERROR`.
- [x] Criar `convex/domainValidators.ts` com validators compartilhados para
      microchip, CPF, telefone, email, datas, enums, paginacao e IDs.
- [x] Criar fixtures de teste com usuarios admin, agente prefeitura,
      voluntario, cao com microchip, tutor sem alerta e tutor com alerta.

### Frontend

- [x] Inicializar Vite, React, TypeScript, Tailwind e shadcn/ui.
- [x] Criar shell tecnico inicial da aplicacao.
- [x] Configurar aliases e estrutura base de `src/app`, `src/components` e
      `src/lib`.
- [x] Criar roteamento com as rotas listadas neste arquivo.
- [x] Criar layout autenticado mobile-first com header fixo, menu inferior no
      mobile e navegacao lateral no desktop.
- [x] Criar componentes base: `PageHeader`, `EmptyState`, `ErrorState`,
      `PermissionDenied`, `LoadingSkeleton`, `ConfirmDialog`, `StepperForm`,
      `FilterBar`, `StatusBadge`, `SeverityBadge`, `PermissionSummary`.
- [x] Implementar cores de gravidade: info cinza, baixa verde, media amarelo,
      alta vermelho.
- [x] Implementar cores de status do cao: na ONG azul, adotado verde,
      desaparecido amarelo, falecido cinza, transferido roxo.
- [x] Implementar copy padrao para acoes criticas: "Confirmar", "Cancelar",
      "Salvar", "Registrar ocorrencia", "Continuar", "Voltar", "Nao tenho
      permissao para isso".

### Qualidade

- [x] Configurar ESLint, Prettier, Vitest, Testing Library e Playwright.
- [x] Criar `npm run quality`.
- [x] Criar teste E2E de fundacao.
- [x] Criar `src/test/render.tsx` para renderizar componentes com providers.
- [x] Criar `src/test/fixtures.ts` com dados realistas de cao, tutor,
      ocorrencia, permissao e usuario.
- [x] Criar padrao de testes Convex com banco isolado por caso de teste.
- [x] Criar Playwright projects para 360px mobile, 390px mobile e desktop.

## Fase 1 - Modelo de dominio, permissoes e seeds

### Backend

- [x] Modelar `users` com nome, email, telefone, organizacao, ativo, criado_em,
      criado_por, atualizado_em, atualizado_por e ultimo_acesso_em.
- [x] Modelar `user_permissions` como array de strings no proprio `users` para
      leitura simples e rapida.
- [x] Modelar `permission_templates` com nome, descricao, permissions,
      ativo, criado_por, criado_em, atualizado_por e atualizado_em.
- [x] Modelar `dogs` com microchip unico, nome, sexo,
      data_nascimento_aproximada, porte, raca_aparente, cor_pelagem,
      caracteristicas_visuais, caracteristicas_comportamentais, condicoes_saude,
      castrado, vacinas_em_dia, foto_perfil_storage_id, status_atual,
      tutor_atual_id, observacoes, criado_em, criado_por, atualizado_em e
      atualizado_por.
- [x] Modelar `dog_photos` com dog_id, storage_id, descricao, criado_em e
      criado_por.
- [x] Modelar `tutors` com nome_completo, cpf, rg, telefone, email,
      endereco_logradouro, endereco_numero, endereco_complemento, endereco_cep,
      bairro_id, data_nascimento, observacoes, criado_em, criado_por,
      atualizado_em e atualizado_por.
- [x] Modelar `bairros` com nome, ativo, criado_em, criado_por, atualizado_em e
      atualizado_por.
- [x] Modelar `occurrence_types` com nome, categoria, requer_foto,
      gravidade_padrao, ativo, criado_por, criado_em, atualizado_por e
      atualizado_em.
- [x] Modelar `occurrences` com dog_id, tutor_id, tutor_snapshot,
      atribuivel_ao_tutor, occurrence_type_id, gravidade, data_ocorrencia,
      bairro_id, local_descricao, descricao, registrado_por, original_id,
      adoption_payload, criado_em.
- [x] Modelar `occurrence_photos` com occurrence_id, storage_id, descricao,
      criado_em e criado_por.
- [x] Modelar `tutor_dog_history` com dog_id, tutor_id, inicio, fim,
      tipo_inicio, tipo_fim, occurrence_id_inicio e occurrence_id_fim.
- [x] Modelar `notifications` com user_id, tipo, titulo, mensagem,
      entidade_tipo, entidade_id, lida, criado_em e lida_em.
- [x] Modelar `audit_logs` com `actor_user_id`, `action`, `entity_type`,
      `entity_id`, `summary`, `metadata` e `created_at`.
- [x] Criar indices `users.by_email`, `users.by_active`, `dogs.by_microchip`,
      `dogs.by_status`, `dogs.by_tutor`, `tutors.by_cpf`, `tutors.by_bairro`,
      `bairros.by_nome`, `occurrences.by_dog`, `occurrences.by_tutor`,
      `occurrences.by_type`, `occurrences.by_gravity`, `occurrences.by_bairro`,
      `occurrences.by_date`, `notifications.by_user_unread` e
      `audit_logs.by_created_at`.
- [x] Criar seed inicial dos tipos: Consulta/Visualizacao, Castracao,
      Vacinacao, Atendimento Veterinario, Resgate na Rua, Devolucao a ONG,
      Adocao, Transferencia de Tutor, Fuga Confirmada, Abandono Suspeito,
      Denuncia de Maus-Tratos, Obito, Correcao/Retificacao e Outro.
- [x] Criar seed inicial de bairros: Centro, Zona Rural e Nao informado.
- [x] Criar seed inicial de templates: Administrador ONG, Agente Prefeitura,
      Voluntario de Campo, Pet Shop Parceiro e Leitura Restrita.
- [x] Testar schema, indices, seeds e mapa de permissoes.

### Frontend

- [x] Criar `src/lib/permissions.ts` espelhando os modulos de UI recebidos do
      backend, sem duplicar a fonte granular de permissao.
- [x] Criar formatadores de status, gravidade, datas, telefones, CPF, CEP e
      microchip.
- [x] Criar mascaras de entrada para CPF, telefone, CEP e microchip de 15
      digitos.
- [x] Criar `SeverityBadge`, `DogStatusBadge`, `TutorAlertBadge` e
      `PermissionLevelSelector`.
- [x] Criar validacoes client-side com as mesmas mensagens dos validators de
      dominio.
- [x] Testar formatadores, mascaras, badges e seletor de permissao.

## Fase 2 - Autenticacao, convites e equipe

### Backend

- [x] Implementar auth com email e senha usando `@convex-dev/auth` e hash
      seguro provido pela biblioteca.
- [x] Implementar convite com token aleatorio, hash do token no banco, uso
      unico e expiracao de 7 dias.
- [x] Implementar aceite de convite criando senha, ativando usuario e gravando
      `ultimo_acesso_em`.
- [x] Implementar reset de senha com token aleatorio, hash do token no banco,
      uso unico e expiracao de 60 minutos.
- [x] Enviar email de convite e reset por Resend em Convex actions.
- [x] Implementar guard `requireActiveUser`.
- [x] Implementar guard `requirePermission`.
- [x] Implementar query `users.list` protegida por `users.invite` ou
      `users.manage_permissions`.
- [x] Implementar mutation `users.invite` protegida por `users.invite`.
- [x] Implementar mutation `users.updatePermissions` protegida por
      `users.manage_permissions`.
- [x] Implementar mutation `users.deactivate` protegida por `users.deactivate`.
- [x] Bloquear remocao da ultima conta ativa com permissoes de Equipe.
- [x] Bloquear usuario de desativar a propria conta.
- [x] Implementar CRUD de templates protegido por `templates.manage`.
- [x] Auditar convite, aceite, reset, mudanca de permissao, desativacao e CRUD
      de templates.
- [x] Testar convite valido, token expirado, token reutilizado, usuario inativo,
      permissoes insuficientes, ultima conta admin e reset de senha.

**Bootstrap dev:** `npx convex run bootstrap:ensureDevAdmin` com
`BOOTSTRAP_ADMIN_PASSWORD` configurado no deployment Convex.

### Frontend

- [x] Criar `/login` com email, senha, loading, erro e link para reset.
- [x] Criar `/accept-invite/:token` com nome bloqueado, email bloqueado,
      organizacao visivel, senha, confirmacao e estados de token invalido,
      expirado e usado.
- [x] Criar `/reset-password` para solicitar email de reset.
- [x] Criar `/reset-password/:token` para criar nova senha.
- [x] Criar layout autenticado com header, menu de conta, badge de notificacoes
      e navegacao filtrada por permissao.
- [x] Criar `/team` com busca por nome/email, filtros ativo/inativo e
      organizacao.
- [x] Criar `/team/invite` com template de permissao, 7 linhas de modulos e
      resumo antes de enviar.
- [x] Criar `/team/:userId` para ver usuario, editar permissoes e desativar.
- [x] Criar `/settings/permission-templates` com criar, editar, duplicar,
      ativar e desativar.
- [x] Criar estado de permissao negada em todas as rotas administrativas.
- [x] Testar login, convite, reset, lista de equipe, convite com template e
      permissao negada.

## Fase 3 - Caes, fotos e busca por microchip

### Backend

- [x] Implementar mutation `dogs.create` protegida por `dogs.create`.
- [x] Exigir microchip de 15 digitos numericos, unico e indexado.
- [x] Exigir foto de perfil no cadastro.
- [x] Implementar mutation `dogs.update` protegida por `dogs.edit`.
- [x] Implementar mutation `dogs.changeStatus` protegida por
      `dogs.change_status`.
- [x] Implementar query `dogs.get` com campos filtrados por permissoes do
      usuario.
- [x] Implementar query `dogs.list` paginada com filtros por status, porte,
      texto e ocorrencia grave nos ultimos 90 dias.
- [x] Implementar query `dogs.findByMicrochip` com busca exata por indice.
- [x] Implementar `storage.createSignedUploadUrl` via Convex File Storage
      (ids `_storage` do schema).
- [x] Implementar mutation `dogPhotos.add` protegida por `dogs.edit`.
- [x] Aceitar fotos JPEG, PNG e WebP ate 8 MB.
- [x] Limitar galeria adicional a 20 fotos por cao.
- [x] Auditar criacao, edicao, mudanca de status e upload de foto.
- [x] Testar microchip duplicado, foto obrigatoria, filtros, permissao e limite
      de fotos.

### Frontend

- [x] Criar Dashboard `/` com busca rapida por microchip, botao grande de camera
      e atalhos permitidos.
- [x] Criar `/dogs` com filtros compactos de status, porte e alerta recente.
- [x] Criar card de cao com foto quadrada, nome, microchip, status e alerta.
- [x] Criar `/dogs/:dogId` com abas Dados, Historico de tutores, Ocorrencias e
      Fotos.
- [x] Criar `/dogs/new` em etapas: Identificacao, Caracteristicas, Saude, Foto,
      Revisao.
- [x] Criar `/dogs/:dogId/edit` reaproveitando o formulario em modo edicao.
- [x] Criar upload de foto com preview, progresso, erro, remover e substituir.
- [x] Criar galeria de fotos adicionais com descricao, limite visivel e estado
      vazio.
- [x] Criar mudanca de status com confirmacao obrigatoria para falecido,
      desaparecido e transferido.
- [x] Criar resultado "microchip nao encontrado" com CTA Cadastrar novo cao para
      quem tem `dogs.create` e CTA Avisar a ONG para quem nao tem.
- [x] Garantir foto de perfil com area minima de 160px no detalhe mobile.
- [x] Testar lista, detalhe, cadastro, edicao, upload, status e busca por
      microchip.

## Fase 4 - Tutores, bairros e alertas derivados

### Backend

- [x] Implementar CRUD de bairros protegido por `bairros.manage`.
- [x] Desativar bairro usado em vez de excluir fisicamente.
- [x] Implementar query `bairros.search` com autocomplete por prefixo.
- [x] Implementar mutation `tutors.create` protegida por `tutors.create`.
- [x] Implementar mutation `tutors.update` protegida por `tutors.edit`.
- [x] Exigir CPF unico para tutor com CPF informado.
- [x] Implementar query `tutors.get` com leitura basica por `tutors.read` e
      campos sensiveis apenas por `tutors.read_sensitive`.
- [x] Implementar calculo de alerta do tutor: vermelho com pelo menos uma
      ocorrencia alta atribuivel; amarelo com pelo menos uma media atribuivel;
      sem alerta com zero medias/altas atribuidas.
- [x] Implementar query `tutors.list` com busca por nome, CPF para usuario com
      permissao sensivel e bairro.
- [x] Auditar criacao e edicao de tutor e gestao de bairros.
- [x] Testar leitura basica, leitura sensivel, alerta derivado, CPF duplicado e
      autocomplete.

### Frontend

- [x] Criar `/tutors` com busca por nome, filtro de bairro e badge de alerta.
- [x] Criar `/tutors/:tutorId` com dados, caes atuais, historico, ocorrencias e
      alertas.
- [x] Ocultar CPF, RG, endereco, telefone, email, data de nascimento,
      observacoes e alertas sem `tutors.read_sensitive`.
- [x] Mostrar bloco "Dados sensiveis ocultos" para usuario sem permissao.
- [x] Criar `/tutors/new` e `/tutors/:tutorId/edit` com mascara de CPF,
      telefone e CEP.
- [x] Criar autocomplete de bairro com opcao de selecionar "Nao informado".
- [x] Criar painel de alerta do tutor com contagem e lista filtravel por
      gravidade.
- [x] Criar `/settings/bairros` com lista, busca, criar, ativar e desativar.
- [x] Testar cadastro, edicao, ficha com permissao sensivel, ficha sem
      permissao sensivel e gestao de bairros.

## Fase 5 - Ocorrencias, auditabilidade e historico tutor-cao

### Backend

- [x] Implementar CRUD de tipos de ocorrencia protegido por
      `occurrence_types.manage`.
- [x] Desativar tipo usado em vez de excluir fisicamente.
- [x] Implementar query `occurrenceTypes.availableForCreate` filtrada pelas
      permissoes do usuario.
- [x] Implementar mutation `occurrences.create` com snapshot do tutor atual.
- [x] Aplicar gravidade padrao do tipo e aceitar ajuste para `baixa`, `media` ou
      `alta` por usuarios com permissao de criar aquela categoria.
- [x] Exigir pelo menos uma foto para tipo com `requer_foto`.
- [x] Aplicar atribuicao default: rotina e clinica = `false`; risco, legal,
      adocao e outro = `true`.
- [x] Bloquear edicao de ocorrencia criada.
- [x] Implementar retificacao criando ocorrencia `Correcao/Retificacao` com
      `original_id` obrigatorio.
- [x] Implementar fotos adicionais de ocorrencia com JPEG, PNG e WebP ate 8 MB.
- [x] Implementar filtros de leitura por categoria: rotina/clinica com
      `occurrences.read`; risco/legal com `occurrences.read_legal`; adocao com
      `dogs.read` e `tutors.read`.
- [x] Implementar listagens por cao, tutor, tipo, gravidade, bairro e periodo.
- [x] Atualizar `tutor_dog_history` transacionalmente em adocao, devolucao,
      abandono, transferencia, obito e desaparecimento.
- [x] Garantir que exista no maximo um historico vigente por cao.
- [x] Manter `dogs.tutor_atual_id` igual ao tutor do historico vigente.
- [x] Auditar criacao de ocorrencia, upload de foto e retificacao.
- [x] Testar snapshots, foto obrigatoria, imutabilidade, retificacao,
      permissoes por categoria e historico.

### Frontend

- [x] Criar `/dogs/:dogId/occurrences/new` iniciado a partir da ficha do cao.
- [x] Mostrar somente tipos de ocorrencia que o usuario pode criar.
- [x] Criar formulario com data default agora, bairro, local livre, descricao,
      gravidade, atribuivel ao tutor e fotos.
- [x] Bloquear botao de concluir ate anexar foto para tipo que exige foto.
- [x] Mostrar texto do toggle de atribuicao: "Conta para o alerta deste tutor".
- [x] Mostrar confirmacao final com cao, tutor snapshot, tipo, gravidade,
      atribuicao e fotos antes de criar ocorrencia sensivel.
- [x] Criar timeline de ocorrencias na ficha do cao com filtros por gravidade,
      categoria e periodo.
- [x] Criar detalhe de ocorrencia com snapshot historico do tutor e fotos.
- [x] Criar acao "Registrar retificacao" sem botao de editar ocorrencia.
- [x] Criar `/settings/occurrence-types` com categoria, gravidade padrao,
      requer foto, ativo/inativo e preview de permissao.
- [x] Testar nova ocorrencia, filtros, permissao, foto obrigatoria, detalhe e
      retificacao.

## Fase 6 - Adocoes, devolucoes e decisoes assistidas

### Backend

- [x] Implementar mutation `adoptions.create` criando ocorrencia de Adocao.
- [x] Salvar adoption_payload com `data_adocao`, `numero_termo_adocao`,
      `responsavel_ong_user_id`, `condicoes_adocao`, `observacoes_adocao`,
      `confirmou_documentos` e `confirmou_orientacoes`.
- [x] Atualizar tutor atual do cao e historico de tutoria de forma atomica.
- [x] Encerrar historico vigente antes de abrir novo historico de adocao.
- [x] Implementar mutation `adoptions.returnToOng` criando ocorrencia de
      Devolucao a ONG e encerrando historico vigente.
- [x] Implementar mutation `adoptions.transferTutor` criando ocorrencia de
      Transferencia de Tutor, encerrando historico vigente e abrindo novo.
- [x] Implementar painel de avaliacao do tutor com ocorrencias medias e altas
      atribuidas.
- [x] Implementar warning de bairro quando o mesmo cao teve Devolucao a ONG ou
      Abandono Suspeito associada a tutor do mesmo bairro do novo tutor.
- [x] Permitir concluir adocao mesmo com warning de bairro.
- [x] Exigir `confirmou_documentos` e `confirmou_orientacoes` como `true`.
- [x] Auditar adocao, devolucao e transferencia.
- [x] Testar transacoes, alertas, warning de bairro, confirmacoes obrigatorias e
      permissoes (`convex/adoptions.test.ts`).

### Frontend

- [x] Criar `/adoptions/new` com selecao de cao por busca e card de resumo.
- [x] Criar etapa de busca de tutor com opcao de cadastrar novo tutor sem sair
      do fluxo.
- [x] Criar painel de avaliacao do tutor antes da ficha de adocao.
- [x] Exibir alerta vermelho para ocorrencias altas atribuidas.
- [x] Exibir alerta amarelo para ocorrencias medias atribuidas.
- [x] Exibir warning de bairro com texto: "Este cao ja teve devolucao ou
      abandono suspeito associado a tutor deste bairro. Revise antes de
      concluir."
- [x] Criar formulario de adocao com numero do termo, data, responsavel ONG,
      condicoes, observacoes, confirmacao de documentos e confirmacao de
      orientacoes.
- [x] Criar revisao final com cao, tutor, alertas, warnings e dados da adocao.
- [x] Criar sucesso com links para ficha do cao e ficha do tutor.
- [x] Criar `/returns/new` com busca do cao, tutor atual bloqueado, motivo,
      fotos, confirmacao e sucesso.
- [x] Criar testes E2E smoke de rotas protegidas (`e2e/adoptions.spec.ts`);
      fluxos autenticados completos cobertos por testes Convex ate existir
      fixture de login E2E.

## Fase 7 - Identificacao por camera, OCR e experiencia de rua

### Backend

- [ ] Implementar action `ocr.extractMicrochip` protegida por usuario ativo.
- [ ] Aceitar imagem JPEG, PNG ou WebP ate 8 MB.
- [ ] Retornar `candidate`, `confidence` e `needsManualReview`.
- [ ] Marcar `needsManualReview` como `true` para qualquer confianca abaixo de
      0.98 ou numero diferente de 15 digitos.
- [ ] Nao persistir imagem enviada ao OCR.
- [ ] Persistir log tecnico sem imagem com usuario, sucesso/falha, candidate,
      confidence e timestamp.
- [ ] Manter `dogs.findByMicrochip` como unica busca final; OCR apenas preenche
      candidato.
- [ ] Testar OCR com sucesso, baixa confianca, falha, numero invalido e entrada
      manual.

### Frontend

- [ ] Criar `/identify` com camera e campo manual sempre visivel.
- [ ] Criar captura de foto da tela do leitor RFID com moldura central,
      instrucao curta e botao grande.
- [ ] Criar tela obrigatoria de confirmacao dos 15 digitos em fonte grande.
- [ ] Permitir editar o numero antes da busca.
- [ ] Mostrar estados "Processando foto", "Nao consegui ler com seguranca" e
      "Confira o numero antes de buscar".
- [ ] Abrir ficha do cao quando encontrado.
- [ ] Mostrar resultado nao encontrado com CTA Cadastrar novo cao para quem tem
      `dogs.create`.
- [ ] Mostrar resultado nao encontrado com CTA Avisar a ONG para quem nao tem
      `dogs.create`; o CTA cria notificacao in-app para a ONG.
- [ ] Otimizar para uso na rua: botoes de pelo menos 44px, poucos toques, alto
      contraste e feedback imediato.
- [ ] Testar fluxo manual, OCR mockado com sucesso, OCR com baixa confianca e
      cao nao encontrado.

## Fase 8 - Notificacoes, auditoria e configuracoes operacionais

### Backend

- [ ] Criar notificacao para ocorrencia de categoria legal.
- [ ] Criar notificacao para aviso de cao nao encontrado.
- [ ] Entregar notificacoes legais para usuarios com `occurrences.read_legal`.
- [ ] Entregar avisos de cao nao encontrado para usuarios com `dogs.create` e
      `dogs.read`.
- [ ] Implementar query `notifications.listMine` com paginacao.
- [ ] Implementar query `notifications.unreadCount`.
- [ ] Implementar mutation `notifications.markRead`.
- [ ] Implementar mutation `notifications.markAllRead`.
- [ ] Implementar deep link para `occurrence`, `dog` e `tutor`.
- [ ] Implementar query `audit.list` protegida por `system.audit_log`.
- [ ] Implementar action `audit.exportCsv` protegida por `system.audit_log`.
- [ ] Testar fan-out de notificacoes, leitura, permissao, deep link, filtros de
      auditoria e exportacao CSV.

### Frontend

- [ ] Criar badge de notificacoes no header com contagem de nao lidas.
- [ ] Criar `/notifications` com lidas/nao lidas, agrupamento por data e
      paginacao.
- [ ] Marcar notificacao como lida ao clicar.
- [ ] Navegar para a entidade correta ao clicar em notificacao.
- [ ] Criar `/audit` com filtros por usuario, periodo, entidade e acao.
- [ ] Criar exportacao CSV na tela de auditoria.
- [ ] Criar `/settings` com links para Templates, Tipos de ocorrencia e
      Bairros.
- [ ] Criar estados vazios para notificacoes e auditoria.
- [ ] Testar badge, marcar lida, marcar todas lidas, deep link, filtros e CSV.

## Fase 9 - UX final, acessibilidade, performance e prontidao

### Backend

- [ ] Revisar todas as queries de listagem e substituir scans por indices.
- [ ] Padronizar paginacao com limite padrao 25 e limite maximo 100.
- [ ] Revisar todas as mutations sensiveis para `requirePermission` e
      `recordAudit`.
- [ ] Revisar todas as queries de tutor para nao vazar dados sensiveis.
- [ ] Implementar exportacao operacional CSV para caes, tutores, ocorrencias e
      historico tutor-cao protegida por `system.audit_log`.
- [ ] Revisar erros para retornar codigo estavel sem detalhes sensiveis.
- [ ] Criar `docs/deploy-checklist.md` com variaveis `CONVEX_DEPLOYMENT`,
      `VITE_CONVEX_URL`, `RESEND_API_KEY`, `R2_ACCOUNT_ID`,
      `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` e
      `R2_PUBLIC_BASE_URL`.
- [ ] Rodar testes de regressao do backend.

### Frontend

- [ ] Validar responsividade em 360px, 390px, tablet e desktop com Playwright.
- [ ] Validar navegacao por teclado em menus, modais, abas e formularios.
- [ ] Garantir foco visivel em todos os controles interativos.
- [ ] Garantir alvos de toque de no minimo 44px em fluxos de campo.
- [ ] Revisar contraste de texto, badges, alertas e botoes.
- [ ] Garantir que erros digam o problema e a acao de correcao.
- [ ] Garantir que formularios longos preservem valores ao voltar etapas.
- [ ] Garantir confirmacao antes de sair de formulario sujo.
- [ ] Unificar layout de listas, fichas, timelines e formularios.
- [ ] Criar E2E dos fluxos criticos: login, identificar cao, registrar
      ocorrencia, adocao, convite, permissao negada e exportacao de auditoria.
- [ ] Rodar verificacao visual com Playwright nos principais breakpoints.
- [ ] Rodar `npm run quality` antes de considerar a entrega completa pronta.
