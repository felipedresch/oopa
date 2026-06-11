# DESIGN.md

Direcao visual "Caramelo": papel quente + caramelo de vira-lata. Tema claro
por padrao (uso em campo, luz ambiente clara); dark mode espelhado em tons de
cafe.

## Cor

Estrategia: Restrained com um passo de compromisso no shell. Neutros todos
tintados para o quente (hue ~55-85). O caramelo (`--primary`) carrega acoes
primarias, navegacao ativa e selecao; a sidebar desktop e espresso escuro,
segunda camada neutra com identidade.

Tokens em `src/index.css`. Nunca usar `#000`/`#fff` nem cores Tailwind cruas
(`red-100`, `emerald-950`...). Estados de dominio usam os tokens semanticos:

- `--success` (verde folha): adotado, baixa gravidade, conclusao.
- `--warning` (ambar queimado): desaparecido, gravidade media, alerta amarelo.
- `--info` (azul ardosia): na ONG, informativo, nivel leitura.
- `--alert` (vinho): transferido, nivel manage.
- `--destructive` (terracota): gravidade alta, alerta vermelho, erros.

Chips/badges: fundo `bg-<token>/12` aprox. + texto no token. Sem bordas
laterais coloridas, sem gradiente em texto.

## Tipografia

- UI, dados, labels: Geist Variable.
- Titulos de pagina e secoes (h1/h2 via `font-heading`): Bricolage Grotesque
  Variable, peso 600-700. So em headings, nunca em botoes ou labels.
- Escala fixa rem, ratio ~1.2. Titulo de pagina: `text-2xl/text-3xl` semibold.

## Forma e espaco

- `--radius: 0.85rem`; cantos generosos, amigaveis.
- Caixa dentro de caixa e proibido. Filtros, formularios e secoes vivem na
  pagina, separados por espaco e headings, nao por bordas.
- Cards so para itens de lista navegaveis (cao, tutor, ocorrencia) e para o
  resumo em paineis de confirmacao.
- Sombras quase nulas; profundidade por tinta de fundo e borda 1px.

## Movimento

- Apenas estado: hover/focus/active em 150-200ms, ease-out. Nada decorativo.

## Assinaturas

- Marca: icone de cao em disco caramelo, wordmark "oopa" minusculo em
  Bricolage.
- Empty states: ilustracao tipografica simples (icone em disco `--accent`),
  texto que ensina a proxima acao.
- Avatar de cao sem foto: disco accent com inicial do nome, nunca "Sem foto".
