# Brief de produto

Referencia inicial extraida do documento colado pelo usuario em 2026-06-10.

## Escopo fechado

- Sistema web mobile-first para uma ONG em uma cidade.
- Acesso por convite, controlado pela ONG, com permissoes granulares.
- Sem app nativo, offline, multi-tenant, comunicacao com tutores, financeiro ou
  LGPD formal dentro do escopo.

## Dominios previstos

- Usuarios e permissoes
- Templates de permissao
- Caes
- Fotos de caes
- Tutores
- Bairros
- Tipos de ocorrencia
- Ocorrencias
- Fotos de ocorrencias
- Historico tutor-cao
- Notificacoes in-app
- Auditoria

## Decisoes de modelagem ja assumidas

- Status de confianca do tutor e derivado das ocorrencias, nao armazenado.
- Ocorrencias preservam FK do tutor e snapshot historico do tutor.
- Alertas de bairro em adocao avisam, mas nao bloqueiam.
- Ocorrencias devem ser tratadas como registros auditaveis; a regra final de
  edicao ainda depende de configuracao de sistema.

## Fluxos principais futuros

- Identificar cao por microchip, com OCR apenas na ultima etapa.
- Registrar ocorrencia a partir da ficha do cao.
- Registrar adocao com painel de avaliacao do tutor.
- Convidar usuarios com templates e ajustes de permissao.

## Ordem sugerida de construcao

1. Schema Convex completo e seeds.
2. Auth, convites e middleware de permissoes.
3. CRUD de caes e upload de fotos.
4. CRUD de tutores e bairros.
5. Ocorrencias, snapshots e historico tutor-cao.
6. Identificacao manual por chip; OCR fica para o fim.
7. Adocoes, notificacoes, equipe, configuracoes, auditoria e polish.
