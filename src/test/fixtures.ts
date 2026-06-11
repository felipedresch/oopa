import type { ModulePermissionMap } from "@/lib/permissions";

export const fixtureModuleMap: ModulePermissionMap = {
  dogs: "manage",
  tutors: "manage",
  occurrences: "write",
  adoptions: "write",
  team: "read",
  settings: "none",
  system: "none",
};

export const fixtureUser = {
  id: "user_admin",
  nome: "Ana Administradora",
  email: "admin@ong.local",
  telefone: "(11) 99999-0001",
  organizacao: "ONG OOPA",
  ativo: true,
  moduleMap: fixtureModuleMap,
};

export const fixtureDog = {
  id: "dog_thor",
  microchip: "123456789012345",
  nome: "Thor",
  sexo: "macho" as const,
  porte: "medio" as const,
  status_atual: "na_ong" as const,
  castrado: true,
  vacinas_em_dia: true,
};

export const fixtureTutor = {
  id: "tutor_daniela",
  nome_completo: "Daniela Tutora",
  cpf: "529.982.247-25",
  telefone: "(11) 98888-0001",
  email: "daniela@example.com",
  bairro: "Centro",
  alerta: "none" as const,
};

export const fixtureTutorWithAlert = {
  ...fixtureTutor,
  id: "tutor_eduardo",
  nome_completo: "Eduardo Tutor",
  cpf: "390.533.447-05",
  alerta: "red" as const,
};

export const fixtureOccurrence = {
  id: "occ_1",
  tipo: "Consulta/Visualizacao",
  gravidade: "info" as const,
  data_ocorrencia: Date.UTC(2026, 5, 1),
  descricao: "Consulta de rotina.",
  atribuivel_ao_tutor: false,
};

export const fixturePermissionTemplate = {
  nome: "Voluntario de Campo",
  descricao: "Cadastro e acompanhamento operacional em campo.",
  moduleMap: {
    dogs: "write",
    tutors: "write",
    occurrences: "write",
    adoptions: "write",
    team: "none",
    settings: "none",
    system: "none",
  } satisfies ModulePermissionMap,
};
