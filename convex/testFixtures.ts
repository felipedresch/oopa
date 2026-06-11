import { moduleMapToPermissions, SEED_PERMISSION_TEMPLATES } from "./permissions";

export const FIXTURE_MICROCHIP = "123456789012345";

export const FIXTURE_USERS = {
  admin: {
    nome: "Ana Administradora",
    email: "admin@ong.local",
    telefone: "11999990001",
    organizacao: "ONG OOPA",
    permissions: moduleMapToPermissions(
      SEED_PERMISSION_TEMPLATES.find((template) => template.nome === "Administrador ONG")!
        .moduleMap,
    ),
  },
  agentePrefeitura: {
    nome: "Bruno Agente",
    email: "agente@prefeitura.local",
    telefone: "11999990002",
    organizacao: "Prefeitura",
    permissions: moduleMapToPermissions(
      SEED_PERMISSION_TEMPLATES.find((template) => template.nome === "Agente Prefeitura")!
        .moduleMap,
    ),
  },
  voluntario: {
    nome: "Carla Voluntaria",
    email: "voluntario@ong.local",
    telefone: "11999990003",
    organizacao: "ONG OOPA",
    permissions: moduleMapToPermissions(
      SEED_PERMISSION_TEMPLATES.find((template) => template.nome === "Voluntario de Campo")!
        .moduleMap,
    ),
  },
} as const;

export const FIXTURE_DOG = {
  microchip: FIXTURE_MICROCHIP,
  nome: "Thor",
  sexo: "macho" as const,
  data_nascimento_aproximada: Date.UTC(2021, 2, 15),
  porte: "medio" as const,
  raca_aparente: "SRD",
  cor_pelagem: "Caramelo",
  caracteristicas_visuais: "Orelha cortada",
  caracteristicas_comportamentais: "Dócil",
  condicoes_saude: "Saudavel",
  castrado: true,
  vacinas_em_dia: true,
  status_atual: "na_ong" as const,
  observacoes: "Cao de teste sem alerta.",
};

export const FIXTURE_TUTOR_WITHOUT_ALERT = {
  nome_completo: "Daniela Tutora",
  cpf: "52998224725",
  rg: "1234567",
  telefone: "11988880001",
  email: "daniela@example.com",
  endereco_logradouro: "Rua das Flores",
  endereco_numero: "100",
  endereco_complemento: "Apto 12",
  endereco_cep: "01001000",
  data_nascimento: Date.UTC(1990, 5, 20),
  observacoes: "Tutor sem ocorrencias atribuiveis.",
};

export const FIXTURE_TUTOR_WITH_ALERT = {
  nome_completo: "Eduardo Tutor",
  cpf: "39053344705",
  rg: "7654321",
  telefone: "11988880002",
  email: "eduardo@example.com",
  endereco_logradouro: "Av. Central",
  endereco_numero: "250",
  endereco_cep: "01002000",
  data_nascimento: Date.UTC(1985, 8, 10),
  observacoes: "Tutor com historico de alerta para testes futuros.",
};
