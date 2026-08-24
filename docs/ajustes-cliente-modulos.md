# Ajustes do cliente (OPAA) e novos módulos

Fonte: lista de ajustes passada pela ONG após a apresentação do sistema, em
2026-08-22, com decisões confirmadas pela ONG em resposta à primeira versão
deste documento. Organiza os pedidos em módulos, telas, campos e mudanças de
schema. É um documento de **planejamento**, complementar a
`docs/product-brief.md` (escopo original) e `docs/implementation-backlog.md`
(execução das Fases 0-11, já concluídas). Os itens abaixo já foram quebrados
em tarefas executáveis com checkbox em `docs/implementation-backlog-v2.md`
(Fases 12+) — esse é o arquivo para marcar `[x]` conforme o time avança e
commitar.

## Como ler este documento

- **Ajuste**: muda comportamento/campo de algo que já existe no sistema.
- **Novo módulo**: não existe hoje, precisa de tabela(s), telas e permissões
  novas.
- Cada item referencia o pedido original do cliente entre aspas.
- A seção 7 registra as decisões já confirmadas pela ONG (com a resposta
  literal) para não precisarem ser perguntadas de novo.

## 1. Estado atual (resumo)

O sistema já implementado (Convex + React, ver `docs/implementation-backlog.md`
fases 0-11) cobre:

- **Animais** (`dogs`): cadastro com microchip único obrigatório, espécie
  (cão/gato), porte, saúde, foto, status (`na_ong`, `adotado`, `desaparecido`,
  `falecido`, `transferido`), identificação por câmera/OCR.
- **Tutores** (`tutors`): dados pessoais, CPF/RG únicos, endereço, bairro,
  alerta derivado de ocorrências. **Vai ser renomeada para `people`** — ver
  3.1.
- **Ocorrências** (`occurrences`): sempre vinculadas a um animal
  (`dog_id` obrigatório), tutor opcional com snapshot histórico, categorias
  (rotina, clínica, risco, legal, adoção, outro), gravidade, fotos,
  imutáveis (correção vira nova ocorrência).
- **Adoções e devoluções** (`adoptions.ts`): fluxo com avaliação de tutor,
  aviso de bairro, termo de adoção (só como texto/número, sem arquivo).
- **Bairros, tipos de ocorrência, templates de permissão, equipe,
  notificações in-app, auditoria com exportação CSV.**
- Menu atual é uma lista plana (não agrupada por módulo):
  Início, Identificar, Cães, Tutores, Equipe, Notificações, Auditoria,
  Configurações (`src/app/layouts/AppLayout.tsx`).
- Não existe: cron/agendamento (`convex/crons.ts` não existe), upload de PDF,
  cadastro de serviços, prontuário médico, notas fiscais, denúncia pública,
  fila de castração, solicitação de resgate, busca global, calendário,
  cadastro de dados da própria ONG.

## 2. Proposta de menu > módulos

```
Início
Identificar (busca por microchip / câmera)
Calendário
Busca global (campo no topo, não é item de menu)

Cadastros
  - Animais            (era "Cães", com filtro de status incluindo "comunitário")
  - Pessoas            (era "Tutores", generalizado)
  - Bairros
  - Serviços           (novo — catálogo, ver 4.4)
  - Insumos            (novo — medicamentos e materiais, ver 4.4)

Ocorrências
  - Visão geral         (novo — todas as ocorrências, com ou sem animal)
  - Link para portal público de denúncia (fora do login)

Adoções e devoluções       (existente + termo em PDF)
  - Acompanhamentos pós-adoção (novo)

Castração                  (novo)
  - Fila de solicitações

Resgates                   (novo)
  - Solicitações de resgate

Atendimentos                (novo)
  - Prontuário médico
  - Agenda / registro de atendimentos
  - Notas fiscais

Relatórios                  (novo)

Equipe                      (existente)
Notificações                 (existente)
Auditoria                    (existente)
Configurações                (existente + Dados da ONG + regras de
                              acompanhamento pós-adoção + preferência de
                              alerta de resgate)
```

Serviços e Insumos ficam em **Cadastros**, não em Atendimentos — são dados
mestres reutilizados por qualquer atendimento, mesmo padrão de Bairros
(cadastra uma vez, usa em vários lugares). "Ocorrências" deixa de ter duas
sub-telas separadas (uma para ocorrência normal, outra para "geral"): vira
uma única visão consolidada, com a triagem de denúncia pública embutida
nela — ver 3.5 e 4.1.

Cada módulo continua controlado por permissão granular (`convex/permissions.ts`),
seguindo o padrão `modulo.acao` já usado. Módulos novos precisam entrar em
`UI_MODULES` e ganhar sua própria linha em `MODULE_LEVEL_PERMISSIONS`.

## 3. Ajustes em módulos existentes

### 3.1 Pessoas (rename de Tutores)

> "Generalizar o tutor para pessoas, e poder selecionar se é tutor ou não"

**Decisão confirmada: renomear a tabela agora**, produto ainda em fase
inicial de uso — não vale carregar o nome técnico `tutors` indefinidamente.

- Rename mecânico e amplo, deve ser feito como passo isolado antes de
  qualquer campo novo (para não misturar rename com feature nova no mesmo
  diff):
  - `convex/schema.ts`: tabela `tutors` → `people`; `dogs.tutor_atual_id` →
    `dogs.pessoa_atual_id`; `occurrences.tutor_id` → `occurrences.pessoa_id`;
    `tutorSnapshotValidator` → `personSnapshotValidator`; tabela
    `tutor_dog_history` → `person_dog_history` (`tutor_id` → `pessoa_id`).
  - Índices: `tutors.by_cpf`/`by_rg`/`by_bairro` → `people.by_cpf`/`by_rg`/`by_bairro`;
    `dogs.by_tutor` → `dogs.by_pessoa`; `occurrences.by_tutor` → `occurrences.by_pessoa`.
  - Arquivos: `convex/tutors.ts` → `convex/people.ts`,
    `convex/lib/tutors.ts` → `convex/lib/people.ts`,
    `convex/tutors.test.ts` → `convex/people.test.ts`.
  - Permissões: `tutors.read`, `tutors.read_sensitive`, `tutors.create`,
    `tutors.edit` → `people.read`, `people.read_sensitive`, `people.create`,
    `people.edit`; `UI_MODULES` item `tutors` → `people`.
  - Frontend: `TutorsListPage`/`TutorDetailPage`/`TutorFormPage` →
    `PeopleListPage`/`PersonDetailPage`/`PersonFormPage`; rotas `/tutors`,
    `/tutors/new`, `/tutors/:tutorId`, `/tutors/:tutorId/edit` →
    `/people`, `/people/new`, `/people/:personId`, `/people/:personId/edit`.
- Depois do rename, tabela `people` passa a representar **pessoas** de forma
  geral: tutor, denunciante, solicitante de castração, solicitante de
  resgate. Uma mesma pessoa pode acumular papéis.
- Campo novo: `papeis: array<"tutor" | "denunciante" | "solicitante_castracao" | "solicitante_resgate">`
  (derivado automaticamente quando a pessoa aparece como tutor atual de um
  animal, denunciante de uma ocorrência etc., editável manualmente também).
- Campo novo: `data_cadastro_cadunico: v.optional(v.number())` (data,
  opcional — nem toda pessoa tem CadÚnico). Exibido na ficha da pessoa, logo
  abaixo do bloco de identificação.
- `/people/new` e `/people/:personId/edit` ganham o campo de data do
  CadÚnico; `/people/:personId` exibe os papéis da pessoa como badges.

### 3.2 Animais — microchip deixa de ser sempre obrigatório

> "Desobrigatoriedade do microchip pro cadastro de pessoas" (no contexto da
> fila de castração, ver 4.3) + "Notificação pós atendimento pro veterinário
> informar o microchip no cadastro do pet"

- Hoje `dogs.microchip` é `v.string()` obrigatório e único
  (`dogs.by_microchip`). Passa a `v.optional(v.string())`, mantendo unicidade
  apenas quando preenchido.
- Novo status derivado (não persistido): "sem microchip" — calculado por
  `microchip === undefined`, exibido como badge de alerta na listagem e na
  ficha do animal.
- Fluxo: animal pode ser criado sem microchip (ex.: fila de castração —
  ver 4.3). Depois de um atendimento (ver módulo Atendimentos), se o animal
  ainda não tiver microchip, o sistema notifica quem tem `dogs.edit` para
  completar o cadastro.
- Notificação nova: tipo `microchip_pendente` em `notificationTypeValidator`,
  com deep link para `/dogs/:dogId/edit`.

### 3.3 Status de animal — "comunitário"

> "Status dos animais, como animais de rua, e isso exibir em uma aba separada
> todos os animais comunitários"

**Decisão confirmada: animal comunitário pode transicionar** para
adotado/na ONG normalmente depois — não é um status definitivo.

- Novo literal em `dogStatusValidator`: `comunitario` (animal de rua/monitorado
  pela ONG, sem tutor fixo enquanto estiver nesse status, mas
  `pessoa_atual_id` pode ser preenchido depois se ele for adotado).
- Transições de status continuam livres via `dogs.changeStatus` (mesma
  mutation e permissão de hoje), sem regra de bloqueio nova.
- **Decisão confirmada: sem tela/rota dedicada.** "Comunitário" entra como
  mais uma opção no filtro de status que já existe em `DogsListPage`
  (mesmo componente `FilterBar` usado hoje para na_ong/adotado/desaparecido/
  falecido/transferido) — não cria rota nova nem item de menu separado.
- Cor de status nova em `src/lib/domain-colors.ts` (hoje: na_ong azul, adotado
  verde, desaparecido amarelo, falecido cinza, transferido roxo) — sugestão:
  `comunitario` em tom `--info` diferenciado ou `--accent`.

### 3.4 Adoções — termo em PDF e acompanhamento pós-adoção

> "Subir o termo de adoção, na hora da adoção, como um pdf que fica registrado
> no animal e no tutor"

- `adoptionPayloadValidator` ganha `termo_adocao_storage_id: v.optional(v.id("_storage"))`.
- Upload de PDF no passo final de `/adoptions/new`, reaproveitando o padrão de
  `storage.createSignedUploadUrl` já usado em fotos de animal/ocorrência
  (aceitar `application/pdf`, limite sugerido 8 MB — mesmo limite das fotos).
- Exibir link/preview do termo em `DogDetailPage` (aba Adoção/Histórico) e em
  `PersonDetailPage`.

> "A cada 3 e depois 6 em 6 meses notificação para contatar o tutor após
> adoção. Animais sem resposta vira ocorrência para visitação"

**Decisões confirmadas:**
- O lembrete é **interno**: gera notificação dentro do sistema para a
  equipe ligar. Não envia SMS/e-mail ao tutor — o escopo "sem comunicação
  com tutores" do brief original continua valendo.
- "Sem resposta" = **7 dias corridos sem registro de contato** depois que o
  lembrete vence. Depois desse prazo, o sistema cria a ocorrência de visita
  automaticamente.

- Nova tabela `adoption_followups`:
  - `dog_id`, `pessoa_id`, `occurrence_id_adocao` (referência à ocorrência de
    adoção original)
  - `data_prevista: number` (próxima data de contato)
  - `sequencia: number` (1 = aos 3 meses, 2+ = a cada 6 meses depois)
  - `status: "pendente" | "contatado" | "sem_resposta" | "concluido"`
  - `tentativas: number`, `ultima_tentativa_em: v.optional(v.number())`
  - `resultado: v.optional(v.string())` (anotação livre de quem ligou)
- Novo `convex/crons.ts` (não existe hoje): job diário que
  1. cria o primeiro `adoption_followup` (sequência 1, 3 meses) ao registrar
     uma adoção;
  2. quando `data_prevista` chega, marca `status = "pendente"` e dispara
     notificação in-app (tipo novo `adoption_followup_due`) para quem tem
     `adoptions.manage`; o item passa a aparecer no Calendário (ver 4.7);
  3. se `data_prevista + 7 dias` passar sem que alguém registre contato
     (`status` continua `pendente`), marca `status = "sem_resposta"` e cria
     automaticamente uma ocorrência do tipo "Visita de acompanhamento" (novo
     `occurrence_type`, categoria `rotina` ou categoria nova
     `acompanhamento`) vinculada ao animal;
  4. se `contatado`/`concluido`, agenda a próxima sequência 6 meses depois da
     data do contato.
**Decisão confirmada: as duas telas, não uma ou outra.**

- Tela dedicada `/adoptions/followups` com todos os follow-ups
  pendentes/atrasados da ONG (visão de fila de trabalho, ordenável por
  atraso), **e também** uma seção "Acompanhamento pós-adoção" na própria
  ficha do animal (`DogDetailPage`), mostrando só os follow-ups daquele
  animal. Mesmos dados, duas entradas — mesma lógica aplicada à seção 3.5
  abaixo para ocorrências.
- Botão para registrar contato (contatado / sem resposta + observação)
  disponível nas duas telas.
- Segue no Calendário (4.7) enquanto `status` for `pendente`.

### 3.5 Ocorrências — visão geral consolidada (ajuste)

> "As ocorrências que têm um animal vinculado também devem aparecer na aba
> geral de acompanhamentos ou ocorrência, pois é ali que a ONG vai olhar
> com cuidado para tudo — se cada coisa fica em uma tela separada não fica
> fácil de acompanhar."

Hoje não existe uma tela de listagem geral de ocorrências — elas só
aparecem na timeline de cada animal (`DogDetailPage`, aba Ocorrências) e não
há nenhuma rota que liste todas de uma vez. Isso é uma lacuna independente
do pedido de denúncias externas, então vira ajuste aqui:

- Nova rota `/occurrences` com a lista de **todas** as ocorrências da ONG,
  com ou sem animal vinculado: ocorrências normais (`dog_id` presente) e
  ocorrências gerais/denúncias convertidas (`dog_id` ausente, categoria
  `denuncia_externa`, ver 4.1) aparecem juntas, ordenadas por data.
- Filtros: tipo (com animal / denúncia externa), categoria, gravidade,
  status, bairro, período — mesmo padrão de `FilterBar` já usado em
  `/dogs` e `/tutors`.
- Uma ocorrência com animal continua aparecendo também na timeline da ficha
  do animal — a lista geral não substitui a visão por animal, soma-se a
  ela. Mesmo princípio de "tela central para revisar tudo + visão dentro do
  registro específico" da seção 3.4.
- Essa tela também é o lugar natural para a triagem das denúncias públicas
  pendentes (ver 4.1b) — em vez de uma rota isolada só para isso, entra como
  uma aba/filtro dentro de `/occurrences`.

## 4. Módulos novos

### 4.1 Denúncias externas e portal público

> "Aba de denúncias externas, ocorrências gerais, sem tutor e sem animal,
> página para denúncias públicas"

Duas peças, porque têm regras de acesso muito diferentes:

**a) Denúncia pública (sem login)**

**Decisão confirmada: sem proteção anti-spam na v1.** Formulário 100%
público, denúncia pode ser totalmente anônima. Se virar problema depois,
ajusta (captcha, rate limit por IP) numa iteração futura — não bloqueia o
lançamento inicial.

- Nova tabela `public_reports`:
  - `nome_denunciante: v.optional(v.string())`, `contato: v.optional(v.string())`
    (telefone ou email — permitir denúncia anônima)
  - `tipo_denuncia: v.string()` (maus-tratos, animal ferido, abandono, acúmulo
    de animais, outro)
  - `descricao: v.string()`
  - `bairro_id: v.optional(v.id("bairros"))`, `local_descricao: v.optional(v.string())`
  - `fotos: array<v.id("_storage")>` (opcional)
  - `status: "novo" | "em_analise" | "convertido" | "arquivado"`
  - `occurrence_id_gerada: v.optional(v.id("occurrences"))` (preenchido quando
    a ONG converte em ocorrência interna)
  - `criado_em`
- Rota pública nova, fora do `ProtectedRoute`: `/denuncia` (formulário) e
  `/denuncia/:id/confirmacao` (tela de "recebemos sua denúncia").
- Mutation pública (sem `getCurrentUser`), só com validação de tamanho de
  texto e limite de fotos.

**b) Triagem interna**

- As denúncias públicas pendentes (`status` `novo`/`em_analise`) aparecem
  como uma aba/filtro dentro da tela geral de ocorrências (`/occurrences`,
  ver 3.5) — não em uma rota isolada — protegidas por permissão nova
  `public_reports.triage` para quem pode agir sobre elas (converter,
  arquivar).
- Ação "Converter em ocorrência": cria um registro em `occurrences` com
  `dog_id` **opcional** — hoje `occurrences.dog_id` é obrigatório
  (`v.id("dogs")`); passa a `v.optional(v.id("dogs"))`, e ganha nova categoria
  `denuncia_externa` para ocorrências sem animal e sem pessoa identificados
  (toda a lógica que assume `dog_id` presente — snapshot de pessoa, timeline
  na ficha do animal — precisa de guarda para o caso `dog_id === undefined`).
- Depois de convertida, a ocorrência aparece na mesma lista geral de
  `/occurrences` junto com todas as outras — sem tela separada só para
  "ocorrências gerais".

### 4.2 Resgates

> "Solicitações de resgate, animal atropelado precisa de atendimento, é
> urgente gerando alertas por gravidade. Depois permitir que a ong descreva o
> que aconteceu nessa solicitação"

**Decisão confirmada: alerta só in-app por enquanto**, e é **opcional por
usuário** — preferência "Deve receber notificações de alerta de resgate",
não uma permissão de módulo.

- Novo campo em `users`: `receber_alertas_resgate: v.optional(v.boolean())`
  (default `true` para quem já tem `rescues.manage`). Exposto como toggle em
  `/profile`.
- Nova tabela `rescue_requests`:
  - `solicitante_id: v.optional(v.id("people"))` (pessoa que acionou, pode
    vir do portal público também)
  - `tipo: v.string()` (atropelado, preso, agressivo/oferece risco, ferido,
    filhotes abandonados, outro)
  - `gravidade: severityValidator` (reaproveita o enum existente
    info/baixa/media/alta; "atropelado" sugere `alta` por padrão)
  - `descricao_solicitante: v.string()` (o que foi relatado)
  - `bairro_id`, `local_descricao`
  - `status: "aberta" | "em_atendimento" | "concluida" | "cancelada"`
  - `descricao_ong: v.optional(v.string())` — preenchido depois pela ONG,
    conforme pedido explícito do cliente
  - `dog_id: v.optional(v.id("dogs"))` — vinculado quando o animal é
    identificado/cadastrado
  - `fotos: array<v.id("_storage")>`
  - `criado_por`, `criado_em`, `atualizado_em`
- Alerta por gravidade: `gravidade === "alta"` dispara notificação in-app
  imediata (fan-out) para usuários com `rescues.manage` **e**
  `receber_alertas_resgate !== false`, reaproveitando `fanOutNotification`
  de `convex/lib/notifications.ts`.
- Telas: `/rescues` (lista ordenada por gravidade e depois data, com destaque
  visual para `alta`), `/rescues/new`, `/rescues/:id` (com campo para a ONG
  preencher `descricao_ong` e mudar status).
- Permissões novas: `rescues.read`, `rescues.create`, `rescues.manage`.

### 4.3 Castração — fila de solicitações

> "Solicitações de castração criar uma página nova, organizar uma fila do
> cadastro de pessoas, pois o animal ainda não tem microchip"

**Decisão confirmada: fila por ordem de solicitação (FIFO)**, com permissão
para a equipe reordenar manualmente a `data_solicitacao` quando precisar
(ex.: prioridade clínica, reagendamento).

- Nova tabela `castration_requests`:
  - `pessoa_id: v.id("people")` (obrigatório — a fila é organizada por
    pessoa, não por animal)
  - `dog_id: v.optional(v.id("dogs"))` — normalmente nulo no início; quando o
    animal já existe no sistema pode ser vinculado direto
  - `animal_descricao: v.object({ nome: v.optional(v.string()), especie: dogSpeciesValidator, porte: dogSizeValidator, sexo: dogSexValidator, cor: v.optional(v.string()) })`
    — descrição leve, sem exigir cadastro completo do animal
  - `data_solicitacao: v.number()` — editável por quem tem `castration.manage`
    (reordena a fila); toda edição é auditada (`recordAudit`) para rastrear
    quem mudou a posição e quando
  - `data_agendada: v.optional(v.number())`
  - `status: "aguardando" | "agendada" | "realizada" | "cancelada" | "nao_compareceu"`
  - `observacoes: v.optional(v.string())`
  - `criado_por`, `criado_em`
- Fila ordenada por `data_solicitacao` ascendente (FIFO); mutation dedicada
  `castration.reorder` (ou edição direta do campo) protegida por
  `castration.manage`.
- Ao marcar `realizada`, se `dog_id` ainda estiver vazio, oferece criar o
  registro em `dogs` (sem microchip, ver ajuste 3.2) e liga o
  `castration_request` a ele; isso também é o gatilho natural para a
  notificação de microchip pendente (3.2) depois do atendimento.
- Telas: `/castration` (fila), `/castration/new`, `/castration/:id`.
- Permissões novas: `castration.read`, `castration.create`, `castration.manage`.

### 4.4 Atendimentos, prontuário, serviços e notas fiscais

Cinco pedidos do cliente que formam um módulo só, porque compartilham a
mesma entidade central (o atendimento):

> "Notificação pós atendimento pro veterinário informar o microchip" (já
> coberto em 3.2) · "Prontuário médico dos cachorros que passarem por
> atendimento" · "Gerar relatório de todos os atendimentos feitos para a ONG,
> precisamos subir as notas fiscais no sistema, pode ser xml. Campos
> relatório: ordem, data atendimento, animal, espécie, solicitante,
> histórico, valor, nota fiscal e data de emissão" · "Cadastro dos serviços
> prestados no atendimento e possibilidade de impressão desses comprovantes
> de venda"

**Decisão confirmada: veterinário é um usuário do sistema** (login próprio),
não texto livre.

- Novo campo em `users`: `veterinario: v.optional(v.boolean())` — marca quem
  aparece no seletor de "veterinário responsável". Editável em `/team/:userId`
  por quem tem `users.manage_permissions`.

**a) Catálogos: Serviços e Insumos** — dados mestres, ficam em **Cadastros**
no menu (não em Atendimentos), mesmo padrão de Bairros: cadastra uma vez,
reutiliza em qualquer atendimento.

> "Serviços não caberia em cadastros? [...] além de serviços podemos incluir
> produtos, pois medicamentos, entre outros podem ser adicionados no
> atendimento, então acho que devemos ter um cadastro de produtos também"

Nome sugerido para o cadastro de medicamentos/materiais: **Insumos** — termo
já usado em contexto clínico/veterinário para item consumível (medicamento,
material de curativo, vacina física etc.); evita a ambiguidade de "produtos",
que soa mais a venda de varejo. Duas tabelas separadas porque os campos não
são idênticos:

- `services` (Serviços): `nome`, `descricao: v.optional(v.string())`,
  `categoria` (consulta, vacina, cirurgia, castração, exame, outro),
  `valor_padrao: v.number()`, `ativo`.
- `supplies` (Insumos): `nome`, `descricao: v.optional(v.string())`,
  `categoria` (medicamento, material, vacina, outro),
  `unidade_medida: v.optional(v.string())` (un., ml, comprimido...),
  `valor_padrao: v.number()`, `ativo`.
- Telas `/catalog/services` e `/catalog/supplies` dentro de Cadastros no
  menu (CRUD simples, mesmo padrão de `OccurrenceTypesSettingsPage`).
  Permissões novas: `services.manage`, `supplies.manage`.
- Controle de estoque/quantidade disponível **não** faz parte deste pedido —
  os dois cadastros são catálogo de nome/preço para lançar no atendimento,
  não gestão de inventário. Registrado aqui só para não confundir com uma
  feature maior de estoque, caso a ONG peça no futuro.

**b) Atendimento** — nova tabela `service_appointments`:

- `dog_id: v.id("dogs")` (ou `v.optional` se precisar cobrir atendimento antes
  do cadastro completo do animal — mesma decisão do módulo Castração)
- `solicitante_id: v.optional(v.id("people"))` — quem trouxe o animal
- `veterinario_user_id: v.id("users")`
- `tipo_atendimento: "consulta" | "vacina" | "cirurgia" | "exame" | "castracao" | "emergencia" | "outro"`
  (usado pelo Calendário e pelos relatórios — independe de quais serviços
  específicos foram lançados)
- `data_atendimento: v.number()`
- `historico: v.string()` — texto livre do que foi feito
- `servicos: array<v.object({ service_id: v.id("services"), quantidade: v.number(), valor_unitario: v.number() })>`
- `insumos: array<v.object({ supply_id: v.id("supplies"), quantidade: v.number(), valor_unitario: v.number() })>`
- `desconto_valor: v.optional(v.number())`
- `valor_total: v.number()` (calculado: soma de serviços + soma de insumos,
  menos desconto)
- `nota_fiscal_storage_id: v.optional(v.id("_storage"))` (XML, ou PDF/DANFE)
- `nota_fiscal_numero: v.optional(v.string())` — preenchido automaticamente
  ao ler o XML, editável
- `data_emissao_nota_fiscal: v.optional(v.number())` — idem
- `status: "agendado" | "realizado" | "cancelado"`
- `criado_por`, `criado_em`

**Decisão confirmada: o sistema lê o XML da nota fiscal e preenche os
campos automaticamente** (não é só arquivo anexado).

- Nova action Convex (ex.: `convex/lib/nfe.ts`) que faz parse do XML de NFe
  (padrão nacional: `infNFe > ide > nNF` para número, `ide > dhEmi` para data
  de emissão, `total > ICMSTot > vNF` para valor) e devolve os campos
  sugeridos para pré-preencher o formulário; usuário confirma/edita antes de
  salvar (parse que falhar não bloqueia o upload, só deixa os campos em
  branco para preenchimento manual). Precisa de um parser XML leve como nova
  dependência (ex. `fast-xml-parser`).

**c) Prontuário médico** — nova tabela `medical_records`, um registro por
atendimento clínico (pode ser 1:1 com `service_appointments` quando o
atendimento é clínico, ou entradas avulsas para histórico legado):

- `dog_id`, `appointment_id: v.optional(v.id("service_appointments"))`
- `data_atendimento`
- `tipo: "consulta" | "vacina" | "cirurgia" | "exame" | "castracao" | "emergencia" | "outro"`
- `veterinario_user_id: v.id("users")`
- `anamnese: v.optional(v.string())`, `diagnostico: v.optional(v.string())`
- `procedimentos: v.optional(v.string())`, `medicamentos: v.optional(v.string())`
- `peso_kg: v.optional(v.number())`, `temperatura_c: v.optional(v.number())`
- `anexos: array<v.id("_storage")>` (exames, laudos)
- `criado_por`, `criado_em`
- Nova aba "Prontuário" em `DogDetailPage`, timeline cronológica (mesmo padrão
  visual da timeline de ocorrências).

**d) Relatório de atendimentos** — tela em Relatórios com exatamente as
colunas pedidas pelo cliente: ordem (número sequencial de exibição), data do
atendimento, animal, espécie, solicitante, histórico, valor, nota fiscal
(link de download) e data de emissão. Filtros por período e por animal/pessoa;
exportação CSV reaproveitando `convex/lib/csv.ts` como os exports atuais.

**e) Comprovante de venda** — **decisão confirmada: documento formal**, não
só impressão simples. Precisa de:

- Novo módulo de configuração **Dados da ONG** — nova tabela
  `organization_settings` (linha única):
  - `razao_social: v.string()`, `nome_fantasia: v.optional(v.string())`,
    `cnpj: v.string()`, `inscricao_estadual: v.optional(v.string())`
  - `endereco_logradouro`, `endereco_numero`, `endereco_complemento`,
    `endereco_cep`, `bairro_id`
  - `telefone: v.optional(v.string())`, `email: v.optional(v.string())`
  - `logo_storage_id: v.optional(v.id("_storage"))`
  - `atualizado_em`, `atualizado_por`
  - Tela `/settings/organization`, permissão nova `organization.manage`.
- Comprovante gerado a partir de um `service_appointments`: cabeçalho com os
  dados da ONG (razão social, CNPJ, endereço, logo), dados da venda (data,
  número do atendimento), pessoa responsável (`solicitante_id`), animal,
  serviços e insumos utilizados com quantidade/valor unitário, desconto e
  total.
- Implementação recomendada: view de impressão estilizada (`window.print()`
  → "Salvar como PDF" do navegador), sem biblioteca de geração de PDF nova —
  resolve o pedido sem adicionar dependência pesada. Se no futuro for preciso
  gerar o arquivo PDF automaticamente (ex.: anexar/enviar por e-mail), isso
  vira uma iteração separada com uma lib de PDF no backend.

Permissões novas: `appointments.read`, `appointments.create`,
`appointments.manage`, `organization.manage`.

### 4.5 Relatórios (módulo)

> "Fazer relatórios de tudo, castração, denúncias, atendimentos urgentes..."

- Tela hub `/reports` com cards para cada relatório:
  - Castrações (fila atual, realizadas por período, taxa de não comparecimento)
  - Denúncias (públicas + externas, por status/bairro/tipo/período)
  - Atendimentos urgentes (resgates gravidade alta + ocorrências categoria
    risco/legal, por período)
  - Atendimentos veterinários/financeiro (ver 4.4d)
  - Adoções e acompanhamento pós-adoção (follow-ups pendentes/atrasados)
- Cada relatório reaproveita o padrão de `convex/exports.ts` (query protegida
  + `buildCsv`), mas passa a viver sob uma permissão dedicada `reports.read`
  em vez de `system.audit_log` (que hoje é usada também para os exports
  operacionais — misturar auditoria do sistema com relatório operacional da
  ONG não faz sentido para o público-alvo deste módulo).

### 4.6 Busca global

> "Busca global nos campos de busca"

- Não é um módulo com tela própria, é um campo de busca fixo no topo
  (desktop: header da sidebar; mobile: dentro do header atual) que consulta
  animais (nome/microchip), pessoas (nome/CPF), ocorrências (a lista
  consolidada de 3.5), resgates e solicitações de castração ao mesmo tempo,
  mostrando resultados agrupados por tipo.
- Backend: nova query `search.global` que roda buscas curtas (`take` baixo,
  ex. 5 por tipo) nas tabelas relevantes, filtrando por permissão do usuário
  antes de retornar (quem não tem `people.read` não recebe resultados de
  pessoa, etc.).

### 4.7 Calendário

> "Podemos criar um calendário também, e este exibe essas informações, de
> lembretes pós adoção, castrações, consultas agendadas... podendo filtrar
> por datas (este mês, mês passado, últimos 30 dias, personalizado) também
> filtrar por tipo de lembrete (consulta, castração, vacinas, lembrete
> adoção...)"

- Não precisa de tabela própria: é uma **view agregada** sobre dados que já
  vão existir em outras tabelas. Nova query `calendar.list` que une, em uma
  forma normalizada `{ data, tipo, titulo, entidade_tipo, entidade_id, status }`:
  - `adoption_followups.data_prevista` → tipo `lembrete_adocao`
  - `castration_requests.data_agendada` (status `agendada`) → tipo `castracao`
  - `service_appointments.data_atendimento` (status `agendado`) → tipo
    conforme `tipo_atendimento` (`consulta`, `vacina`, `cirurgia`, `exame`,
    `castracao`, `emergencia`, `outro`)
  - Cada fonte só entra no resultado se o usuário tiver a permissão de
    leitura do módulo correspondente (`adoptions.read`, `castration.read`,
    `appointments.read`) — sem permissão nova dedicada ao calendário.
- Filtros de período, como presets que viram `{ inicio, fim }` antes de
  consultar: **Este mês**, **Mês passado**, **Últimos 30 dias**,
  **Personalizado** (com seletor de intervalo, reaproveitando o
  `date-picker` já usado em `TutorFormPage`/`AuditPage`).
- Filtro de tipo: seleção múltipla (chips) entre os tipos listados acima.
- Tela `/calendar`: lista agrupada por dia (mobile-first, consistente com o
  resto do produto) — visão de grade mensal fica como evolução futura, não é
  necessária para o pedido original.
- Item novo no menu principal, entre "Identificar" e "Cadastros" (ver seção 2).

## 5. Resumo de mudanças de schema (`convex/schema.ts`)

| Tabela | Mudança |
| --- | --- |
| `tutors` | **renomeada para `people`**; `tutor_id`/`tutor_atual_id` viram `pessoa_id`/`pessoa_atual_id` nas tabelas que referenciam; novos campos `data_cadastro_cadunico`, `papeis` |
| `tutor_dog_history` | renomeada para `person_dog_history` |
| `dogs` | `microchip` de obrigatório para opcional; novo literal `comunitario` em `status_atual` |
| `occurrences` | `dog_id` de obrigatório para opcional; nova categoria `denuncia_externa`; `tutor_id` → `pessoa_id`; nova rota `/occurrences` como listagem geral (ver 3.5) |
| `adoptionPayloadValidator` | novo campo `termo_adocao_storage_id` |
| `notificationTypeValidator` | novos literais `microchip_pendente`, `adoption_followup_due` |
| `users` | novos campos `veterinario`, `receber_alertas_resgate` |
| **novas tabelas** | `adoption_followups`, `public_reports`, `rescue_requests`, `castration_requests`, `services`, `supplies`, `service_appointments`, `medical_records`, `organization_settings` |
| **novo arquivo** | `convex/crons.ts` (não existe hoje) |
| **nova dependência** | parser de XML para leitura de nota fiscal (ex. `fast-xml-parser`) |

## 6. Novas permissões (`convex/permissions.ts`)

Seguindo o padrão `modulo.acao` já usado (e o rename `tutors.*` → `people.*`
da seção 3.1):

- `public_reports.triage`
- `rescues.read`, `rescues.create`, `rescues.manage`
- `castration.read`, `castration.create`, `castration.manage`
- `appointments.read`, `appointments.create`, `appointments.manage`
- `services.manage`
- `supplies.manage`
- `organization.manage`
- `reports.read`

A listagem geral de ocorrências (`/occurrences`, seção 3.5) não precisa de
permissão nova: reaproveita `occurrences.read`/`occurrences.read_legal` já
existentes, só filtrando o que cada usuário já pode ver hoje.

Cada um vira um novo módulo em `UI_MODULES` (`rescues`, `castration`,
`appointments`, `reports`) com sua linha em `MODULE_LEVEL_PERMISSIONS`, e os
templates seed (`SEED_PERMISSION_TEMPLATES`) precisam de revisão — hoje
"Administrador ONG" teria `manage` em tudo, mas os outros perfis (Agente
Prefeitura, Voluntário de Campo, Pet Shop Parceiro) precisam de decisão sobre
o que enxergam nos módulos novos. `receber_alertas_resgate` e `veterinario`
são preferências/atributos de usuário, não entram no catálogo de permissões.

## 7. Decisões confirmadas pela ONG (2026-08-22)

1. **Contato pós-adoção**: lembrete interno, gera notificação in-app; não
   envia nada diretamente ao tutor. Some ao Calendário (4.7).
2. **"Sem resposta"**: 7 dias corridos sem registro de contato após o
   lembrete vencer → sistema cria a ocorrência de visita automaticamente.
3. **Denúncia pública**: sem proteção anti-spam na v1; permite denúncia
   100% anônima. Revisitar depois se virar problema.
4. **Renomear `tutors` para `people`**: sim, renomear agora (produto ainda em
   fase inicial de uso).
5. **Alertas de resgate**: só in-app por enquanto; vira preferência por
   usuário (`receber_alertas_resgate`), não uma notificação forçada para
   todo mundo com o módulo liberado.
6. **Veterinário no prontuário**: é um usuário do sistema, com login
   próprio (`users.veterinario`).
7. **Nota fiscal XML**: sistema lê o XML e preenche número, valor e data de
   emissão automaticamente; usuário confirma/edita antes de salvar.
8. **Comprovante de venda**: documento formal, com dados da ONG (CNPJ, razão
   social etc. cadastrados em tela própria), dados da venda, responsável,
   animal, serviços e descontos — não é só impressão crua.
9. **Fila de castração**: FIFO por data de solicitação, com permissão para a
   equipe reordenar manualmente quando precisar.
10. **Status "comunitário"**: animal pode transicionar normalmente para
    adotado/na ONG depois — não é status definitivo.

Nenhuma decisão de produto está em aberto no momento. Pontos técnicos que
ficam a critério de implementação (não bloqueiam início do trabalho):
formato exato do parser de XML de NFe e biblioteca escolhida; se o
comprovante de venda evolui de "view de impressão" para PDF gerado no
backend fica para uma iteração futura, se necessário.

## 8. Ordem sugerida de implementação

1. Rename `tutors` → `people` (schema, backend, frontend, testes) como passo
   isolado — base para todo o resto que referencia pessoa.
2. Ajustes de schema de baixo risco: microchip opcional, status
   `comunitario`, `dog_id` opcional em ocorrências, campos novos em pessoas
   (CadÚnico, papéis), `users.veterinario`, `users.receber_alertas_resgate`.
3. Termo de adoção em PDF (reaproveita padrão de upload já existente).
4. Ocorrências — visão geral consolidada (`/occurrences`, seção 3.5); pré-
   requisito da triagem de denúncias do passo seguinte.
5. Denúncias externas + portal público (`public_reports`, rota pública,
   triagem dentro de `/occurrences`).
6. Resgates (`rescue_requests`, alertas por gravidade, preferência de
   usuário).
7. Castração (`castration_requests`, fila com reordenação manual).
8. Dados da ONG (`organization_settings`) — pré-requisito do comprovante de
   venda.
9. Serviços + Insumos (catálogos) + Atendimentos + Prontuário + Notas fiscais
   com leitura de XML + comprovante de venda (módulo maior, depende dos
   passos 1, 2 e 8).
10. Acompanhamento pós-adoção (tela dedicada + ficha do animal) +
    `convex/crons.ts` (regra dos 7 dias já definida).
11. Calendário (consome dados dos passos 7, 9 e 10 — precisa que essas
    tabelas já existam).
12. Relatórios (consome dados de todos os módulos anteriores).
13. Busca global (cross-cutting, fica melhor por último, quando todas as
    tabelas já existem).
14. Reorganização do menu em `AppLayout.tsx` para a estrutura de módulos da
    seção 2 — pode ser feita incrementalmente conforme cada módulo entra.
