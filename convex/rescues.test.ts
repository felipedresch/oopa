/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { asUser, ensureSeeds, seedAdmin, seedBairro, seedUser, storeTestImage } from "./testHelpers";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedDog(t: ReturnType<typeof convexTest>, adminId: Id<"users">) {
  const storageId = await storeTestImage(t);
  return await asUser(t, adminId, async (client) =>
    client.mutation(api.dogs.create, {
      microchip: "444444444444444",
      nome: "Bilu",
      especie: "cao",
      sexo: "macho",
      porte: "medio",
      castrado: false,
      vacinas_em_dia: false,
      foto_perfil_storage_id: storageId,
    }),
  );
}

test("create exige rescues.create", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const readerId = await seedUser(t, {
    nome: "Sem permissao",
    email: "sem-rescues@ong.local",
    permissions: ["dogs.read"],
  });

  await expect(
    asUser(t, readerId, async (client) =>
      client.mutation(api.rescues.create, {
        tipo: "atropelado",
        gravidade: "alta",
        descricao_solicitante: "Cão atropelado na avenida principal.",
        photo_storage_ids: [],
      }),
    ),
  ).rejects.toThrow();
});

test("create com gravidade alta notifica apenas gestores com preferencia ativa", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const creatorId = await seedUser(t, {
    nome: "Voluntario",
    email: "voluntario-rescues@ong.local",
    permissions: ["rescues.create"],
  });
  const managerOptedInId = await seedUser(t, {
    nome: "Gestora Ativa",
    email: "gestora-ativa@ong.local",
    permissions: ["rescues.manage", "rescues.read"],
  });
  const managerOptedOutId = await seedUser(t, {
    nome: "Gestor Inativo",
    email: "gestor-inativo@ong.local",
    permissions: ["rescues.manage", "rescues.read"],
    receber_alertas_resgate: false,
  });
  const nonManagerId = await seedUser(t, {
    nome: "Sem Gestao",
    email: "sem-gestao@ong.local",
    permissions: ["rescues.create"],
  });

  await asUser(t, creatorId, async (client) =>
    client.mutation(api.rescues.create, {
      tipo: "atropelado",
      gravidade: "alta",
      descricao_solicitante: "Cão atropelado, precisa de atendimento urgente.",
      photo_storage_ids: [],
    }),
  );

  const optedInCount = await asUser(t, managerOptedInId, async (client) =>
    client.query(api.notifications.unreadCount, {}),
  );
  const optedOutCount = await asUser(t, managerOptedOutId, async (client) =>
    client.query(api.notifications.unreadCount, {}),
  );
  const nonManagerCount = await asUser(t, nonManagerId, async (client) =>
    client.query(api.notifications.unreadCount, {}),
  );

  expect(optedInCount).toBe(1);
  expect(optedOutCount).toBe(0);
  expect(nonManagerCount).toBe(0);
});

test("create com gravidade baixa nao dispara alerta", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const creatorId = await seedUser(t, {
    nome: "Voluntario",
    email: "voluntario-baixa@ong.local",
    permissions: ["rescues.create"],
  });
  const managerId = await seedUser(t, {
    nome: "Gestora",
    email: "gestora-baixa@ong.local",
    permissions: ["rescues.manage", "rescues.read"],
  });

  await asUser(t, creatorId, async (client) =>
    client.mutation(api.rescues.create, {
      tipo: "filhotes_abandonados",
      gravidade: "baixa",
      descricao_solicitante: "Filhotes encontrados, sem risco imediato.",
      photo_storage_ids: [],
    }),
  );

  const count = await asUser(t, managerId, async (client) =>
    client.query(api.notifications.unreadCount, {}),
  );
  expect(count).toBe(0);
});

test("updateStatus e setOngDescription exigem rescues.manage", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const creatorId = await seedUser(t, {
    nome: "Voluntario",
    email: "voluntario-status@ong.local",
    permissions: ["rescues.create"],
  });
  const managerId = await seedUser(t, {
    nome: "Gestora",
    email: "gestora-status@ong.local",
    permissions: ["rescues.manage", "rescues.read"],
  });

  const rescueId = await asUser(t, creatorId, async (client) =>
    client.mutation(api.rescues.create, {
      tipo: "preso",
      gravidade: "media",
      descricao_solicitante: "Animal preso em terreno cercado.",
      photo_storage_ids: [],
    }),
  );

  await expect(
    asUser(t, creatorId, async (client) =>
      client.mutation(api.rescues.updateStatus, { rescueId, status: "em_atendimento" }),
    ),
  ).rejects.toThrow();

  await asUser(t, managerId, async (client) =>
    client.mutation(api.rescues.updateStatus, { rescueId, status: "em_atendimento" }),
  );
  await asUser(t, managerId, async (client) =>
    client.mutation(api.rescues.setOngDescription, {
      rescueId,
      descricao_ong: "Equipe a caminho do local.",
    }),
  );

  const detail = await asUser(t, managerId, async (client) =>
    client.query(api.rescues.get, { rescueId }),
  );
  expect(detail?.status).toBe("em_atendimento");
  expect(detail?.descricao_ong).toBe("Equipe a caminho do local.");
});

test("list ordena por gravidade e depois por data mais recente", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const creatorId = await seedUser(t, {
    nome: "Voluntario",
    email: "voluntario-list@ong.local",
    permissions: ["rescues.create", "rescues.read"],
  });

  const lowId = await asUser(t, creatorId, async (client) =>
    client.mutation(api.rescues.create, {
      tipo: "outro",
      gravidade: "baixa",
      descricao_solicitante: "Prioridade baixa.",
      photo_storage_ids: [],
    }),
  );
  const highOldId = await asUser(t, creatorId, async (client) =>
    client.mutation(api.rescues.create, {
      tipo: "atropelado",
      gravidade: "alta",
      descricao_solicitante: "Primeira ocorrência de alta gravidade.",
      photo_storage_ids: [],
    }),
  );
  const highNewId = await asUser(t, creatorId, async (client) =>
    client.mutation(api.rescues.create, {
      tipo: "agressivo",
      gravidade: "alta",
      descricao_solicitante: "Segunda ocorrência de alta gravidade, mais recente.",
      photo_storage_ids: [],
    }),
  );

  const list = await asUser(t, creatorId, async (client) => client.query(api.rescues.list, {}));

  expect(list.map((item) => item._id)).toEqual([highNewId, highOldId, lowId]);
});

test("create aceita dog_id e solicitante_id, e get enriquece com nomes", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const dogId = await seedDog(t, adminId);
  const bairroId = await seedBairro(t, "Centro");
  const personId = await asUser(t, adminId, async (client) =>
    client.mutation(api.people.create, {
      nome_completo: "Solicitante Teste",
      cpf: "39053344705",
    }),
  );

  const rescueId = await asUser(t, adminId, async (client) =>
    client.mutation(api.rescues.create, {
      tipo: "ferido",
      gravidade: "media",
      descricao_solicitante: "Animal ferido identificado.",
      bairro_id: bairroId,
      dog_id: dogId,
      solicitante_id: personId,
      photo_storage_ids: [],
    }),
  );

  const detail = await asUser(t, adminId, async (client) =>
    client.query(api.rescues.get, { rescueId }),
  );

  expect(detail?.dog_nome).toBe("Bilu");
  expect(detail?.solicitante_nome).toBe("Solicitante Teste");
  expect(detail?.bairro_nome).toBe("Centro");
});

test("list e get exigem rescues.read", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const creatorId = await seedUser(t, {
    nome: "Sem leitura",
    email: "sem-leitura-rescues@ong.local",
    permissions: ["rescues.create"],
  });

  const rescueId = await asUser(t, creatorId, async (client) =>
    client.mutation(api.rescues.create, {
      tipo: "outro",
      gravidade: "info",
      descricao_solicitante: "Sem gravidade relevante.",
      photo_storage_ids: [],
    }),
  );

  await expect(
    asUser(t, creatorId, async (client) => client.query(api.rescues.list, {})),
  ).rejects.toThrow();

  await expect(
    asUser(t, creatorId, async (client) => client.query(api.rescues.get, { rescueId })),
  ).rejects.toThrow();
});
