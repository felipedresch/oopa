/**
 * Corrige acentuação em strings literais de UI (src/ e mensagens user-facing em convex/).
 * Não altera identificadores, valores de enum/API ou paths.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

const GLOB_DIRS = [
  path.join(ROOT, "src"),
  path.join(ROOT, "convex/errors.ts"),
  path.join(ROOT, "convex/emails.ts"),
  path.join(ROOT, "convex/users.ts"),
  path.join(ROOT, "convex/adoptions.ts"),
  path.join(ROOT, "convex/notifications.ts"),
  path.join(ROOT, "convex/ocr.ts"),
  path.join(ROOT, "convex/ocrRecognize.ts"),
  path.join(ROOT, "convex/auth.ts"),
  path.join(ROOT, "convex/seeds.ts"),
  path.join(ROOT, "convex/occurrences.ts"),
  path.join(ROOT, "convex/occurrenceTypes.ts"),
  path.join(ROOT, "convex/lib/adoptions.ts"),
  path.join(ROOT, "convex/lib/occurrences.ts"),
];

const COMPOUND_REPLACEMENTS = [
  ["ocorrencias", "ocorrências"],
  ["ocorrencia", "ocorrência"],
  ["Ocorrencias", "Ocorrências"],
  ["Ocorrencia", "Ocorrência"],
  ["devolucoes", "devoluções"],
  ["devolucao", "devolução"],
  ["Devolucao", "Devolução"],
  ["adocoes", "adoções"],
  ["adocao", "adoção"],
  ["Adocao", "Adoção"],
  ["configuracoes", "configurações"],
  ["configuracao", "configuração"],
  ["Configuracoes", "Configurações"],
  ["notificacoes", "notificações"],
  ["notificacao", "notificação"],
  ["Notificacoes", "Notificações"],
  ["identificacao", "identificação"],
  ["Identificacao", "Identificação"],
  ["informacoes", "informações"],
  ["informacao", "informação"],
  ["Informacao", "Informação"],
  ["descricao", "descrição"],
  ["Descricao", "Descrição"],
  ["observacoes", "observações"],
  ["condicoes", "condições"],
  ["confirmacoes", "confirmações"],
  ["retificacao", "retificação"],
  ["Retificacao", "Retificação"],
  ["avaliacao", "avaliação"],
  ["Avaliacao", "Avaliação"],
  ["revisao", "revisão"],
  ["Revisao", "Revisão"],
  ["caracteristicas", "características"],
  ["Caracteristicas", "Características"],
  ["organizacao", "organização"],
  ["Organizacao", "Organização"],
  ["permissoes", "permissões"],
  ["permissao", "permissão"],
  ["Permissao", "Permissão"],
  ["usuarios", "usuários"],
  ["usuario", "usuário"],
  ["Usuario", "Usuário"],
  ["historico", "histórico"],
  ["Historico", "Histórico"],
  ["prontuario", "prontuário"],
  ["catalogo", "catálogo"],
  ["Catalogo", "Catálogo"],
  ["exportacao", "exportação"],
  ["criacao", "criação"],
  ["gestao", "gestão"],
  ["Gestao", "Gestão"],
  ["navegacao", "navegação"],
  ["Navegacao", "Navegação"],
  ["proximas", "próximas"],
  ["implementacao", "implementação"],
  ["obrigatorias", "obrigatórias"],
  ["obrigatorios", "obrigatórios"],
  ["obrigatorio", "obrigatório"],
  ["obrigatoria", "obrigatória"],
  ["possivel", "possível"],
  ["Possivel", "Possível"],
  ["invalido", "inválido"],
  ["Invalido", "Inválido"],
  ["invalida", "inválida"],
  ["numero", "número"],
  ["Numero", "Número"],
  ["numeros", "números"],
  ["digitos", "dígitos"],
  ["analise", "análise"],
  ["aparecerao", "aparecerão"],
  ["Clinica", "Clínica"],
  ["clinica", "clínica"],
  ["Saude", "Saúde"],
  ["saude", "saúde"],
  ["modulos", "módulos"],
  ["modulo", "módulo"],
  ["administrativas", "administrativas"],
  ["inicio", "início"],
  ["Inicio", "Início"],
  ["area", "área"],
  ["Area", "Área"],
  ["comecamos", "começamos"],
  ["camera", "câmera"],
  ["rapido", "rápido"],
  ["Rapido", "Rápido"],
  ["sera", "será"],
  ["iluminacao", "iluminação"],
  ["valido", "válido"],
  ["valida", "válida"],
  ["recebera", "receberá"],
  ["voltara", "voltará"],
  ["atribuivel", "atribuível"],
  ["sensivel", "sensível"],
  ["seguranca", "segurança"],
  ["Seguranca", "Segurança"],
  ["associada", "associada"],
  ["Media", "Média"],
  ["Observacoes", "Observações"],
  ["Numero", "Número"],
  ["Organizacao", "Organização"],
  ["Permissao", "Permissão"],
  ["Condicoes", "Condições"],
  ["condicoes", "condições"],
];

const WORD_REPLACEMENTS = [
  ["Nao", "Não"],
  ["nao", "não"],
  ["Voce", "Você"],
  ["voce", "você"],
  ["Ola", "Olá"],
  ["Faca", "Faça"],
  ["Caes", "Cães"],
  ["caes", "cães"],
  ["Cao", "Cão"],
  ["cao", "cão"],
  ["esta", "está"],
  ["Esta", "Está"],
  ["ja", "já"],
  ["Ja", "Já"],
  ["Ate", "Até"],
  ["acao", "ação"],
  ["Acoes", "Ações"],
  ["acoes", "ações"],
];

function shouldFixString(str) {
  if (!str.trim()) return false;
  if (/^\/[\w/-]*$/.test(str)) return false;
  if (/^[a-z0-9_.-]+$/.test(str) && !/[A-ZÀ-Ú]/.test(str)) return false;
  if (/^[a-z_]+\.[a-z_.]+$/.test(str)) return false;
  if (/^#[0-9a-fA-F]+$/.test(str)) return false;
  if (/^000 000 000 000 000$/.test(str)) return false;
  if (/^ocorrencias$/.test(str)) return false;
  if (/^historico-tutor-cao$/.test(str)) return false;
  if (str.includes("@/") || /\/pages\/\w+\.tsx?$/.test(str)) return false;
  if (/^(?:[\w:[\]/().,%#-]+)$/.test(str) && !/\s/.test(str) && str.length > 20) {
    return false;
  }
  if (/^(?:fixed|flex|grid|group|hover:|focus-visible:|data-\[|dark:|sm:|lg:|md:)/.test(str)) {
    return false;
  }
  return true;
}

function fixStringContent(str) {
  let result = str;
  for (const [from, to] of WORD_REPLACEMENTS) {
    result = result.replace(new RegExp(`\\b${from}\\b`, "g"), to);
  }
  for (const [from, to] of COMPOUND_REPLACEMENTS) {
    result = result.split(from).join(to);
  }
  return result;
}

function fixFileContent(content) {
  return content.replace(/(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g, (full, quote, inner) => {
    if (!shouldFixString(inner)) {
      return full;
    }
    const fixed = fixStringContent(inner);
    if (fixed === inner) {
      return full;
    }
    return `${quote}${fixed}${quote}`;
  });
}

function collectFiles(dirOrFile) {
  const stat = fs.statSync(dirOrFile);
  if (stat.isFile()) {
    return dirOrFile.endsWith(".ts") || dirOrFile.endsWith(".tsx") ? [dirOrFile] : [];
  }
  const files = [];
  for (const entry of fs.readdirSync(dirOrFile, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "_generated") continue;
    const full = path.join(dirOrFile, entry.name);
    files.push(...collectFiles(full));
  }
  return files;
}

let changed = 0;
const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename);

if (isMain) {
  for (const target of GLOB_DIRS) {
    for (const file of collectFiles(target)) {
      const original = fs.readFileSync(file, "utf8");
      const updated = fixFileContent(original);
      if (updated !== original) {
        fs.writeFileSync(file, updated);
        changed += 1;
        console.log("updated:", path.relative(ROOT, file));
      }
    }
  }

  console.log(`\n${changed} arquivo(s) atualizado(s).`);
}
