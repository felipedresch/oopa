/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { asUser, ensureSeeds, seedAdmin, seedUser, storeTestImage } from "./testHelpers";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

/**
 * Cria um registro "Bolota" em cada tabela buscável, para que um único termo
 * cruze todos os tipos.
 */
async function seedSearchableData(t: ReturnType<typeof convexTest>, adminId: Id<"users">) {
  const storageId = await storeTestImage(t);
  const dogId = await asUser(t, adminId, (client) =>
    client.mutation(api.dogs.create, {
      microchip: "987654321098765",
      nome: "Bolota",
      especie: "cao",
      sexo: "macho",
      porte: "medio",
      castrado: false,
      vacinas_em_dia: true,
      foto_perfil_storage_id: storageId,
    }),
  );

  const personId = await asUser(t, adminId, (client) =>
    client.mutation(api.people.create, {
      nome_completo: "Bolota da Silva",
      cpf: "39053344705",
    }),
  );

  const types = await asUser(t, adminId, (client) =>
    client.query(api.occurrenceTypes.list, {}),
  );
  const rotinaTypeId = types.find((type) => type.nome === "Consulta/Visualização")!._id;
  const legalTypeId = types.find((type) => type.nome === "Denúncia de Maus-Tratos")!._id;

  const occurrenceId = await asUser(t, adminId, (client) =>
    client.mutation(api.occurrences.create, {
      dogId,
      occurrenceTypeId: rotinaTypeId,
      descricao: "Consulta de rotina da Bolota.",
      data_ocorrencia: Date.UTC(2026, 3, 10),
      photo_storage_ids: [],
    }),
  );
  const legalOccurrenceId = await asUser(t, adminId, (client) =>
    client.mutation(api.occurrences.create, {
      dogId,
      occurrenceTypeId: legalTypeId,
      descricao: "Suspeita de maus-tratos contra a Bolota.",
      data_ocorrencia: Date.UTC(2026, 3, 11),
      photo_storage_ids: [storageId],
    }),
  );

  const rescueId = await asUser(t, adminId, (client) =>
    client.mutation(api.rescues.create, {
      tipo: "Resgate da Bolota",
      gravidade: "alta",
      descricao_solicitante: "Animal ferido na via.",
      photo_storage_ids: [],
    }),
  );

  const castrationId = await asUser(t, adminId, (client) =>
    client.mutation(api.castration.create, {
      pessoa_id: personId,
      animal_descricao: { nome: "Bolota", especie: "cao", porte: "medio", sexo: "macho" },
    }),
  );

  return { dogId, personId, occurrenceId, legalOccurrenceId, rescueId, castrationId };
}

test("global exige usuário autenticado", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);

  await expect(t.query(api.search.global, { termo: "bolota" })).rejects.toThrow();
});

test("global ignora termo curto demais", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  await seedSearchableData(t, adminId);

  const groups = await asUser(t, adminId, (client) =>
    client.query(api.search.global, { termo: "b" }),
  );

  expect(groups).toEqual([]);
});

test("global cruza todos os tipos com um único termo", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const seeded = await seedSearchableData(t, adminId);

  const groups = await asUser(t, adminId, (client) =>
    client.query(api.search.global, { termo: "bolota" }),
  );

  expect(groups.map((group) => group.tipo)).toEqual([
    "dogs",
    "people",
    "occurrences",
    "rescues",
    "castration",
  ]);
  expect(groups[0]?.itens[0]).toMatchObject({
    id: seeded.dogId,
    titulo: "Bolota",
    rota: `/dogs/${seeded.dogId}`,
  });
  expect(groups[1]?.itens[0]?.rota).toBe(`/people/${seeded.personId}`);
  expect(groups[3]?.itens[0]?.rota).toBe(`/rescues/${seeded.rescueId}`);
  expect(groups[4]?.itens[0]?.rota).toBe(`/castration/${seeded.castrationId}`);
});

test("global encontra animal por microchip e pessoa por CPF", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  await seedSearchableData(t, adminId);

  const byMicrochip = await asUser(t, adminId, (client) =>
    client.query(api.search.global, { termo: "987654321098765" }),
  );
  expect(byMicrochip.find((group) => group.tipo === "dogs")?.itens).toHaveLength(1);

  const byCpf = await asUser(t, adminId, (client) =>
    client.query(api.search.global, { termo: "390.533.447-05" }),
  );
  expect(byCpf.find((group) => group.tipo === "people")?.itens).toHaveLength(1);
});

test("global não busca CPF sem people.read_sensitive", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  await seedSearchableData(t, adminId);
  const basicId = await seedUser(t, {
    nome: "Leitura básica",
    email: "basica@ong.local",
    permissions: ["people.read"],
  });

  const groups = await asUser(t, basicId, (client) =>
    client.query(api.search.global, { termo: "39053344705" }),
  );

  expect(groups).toEqual([]);
});

test("global omite tipos sem permissão de leitura", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  await seedSearchableData(t, adminId);
  const onlyDogsId = await seedUser(t, {
    nome: "Só animais",
    email: "so-animais@ong.local",
    permissions: ["dogs.read"],
  });

  const groups = await asUser(t, onlyDogsId, (client) =>
    client.query(api.search.global, { termo: "bolota" }),
  );

  expect(groups.map((group) => group.tipo)).toEqual(["dogs"]);
});

test("global respeita a visibilidade por categoria de ocorrência", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const seeded = await seedSearchableData(t, adminId);

  const basicReaderId = await seedUser(t, {
    nome: "Sem categoria legal",
    email: "sem-legal@ong.local",
    permissions: ["occurrences.read"],
  });
  const legalReaderId = await seedUser(t, {
    nome: "Com categoria legal",
    email: "com-legal@ong.local",
    permissions: ["occurrences.read", "occurrences.read_legal"],
  });

  const basic = await asUser(t, basicReaderId, (client) =>
    client.query(api.search.global, { termo: "bolota" }),
  );
  expect(basic[0]?.itens.map((item) => item.id)).toEqual([seeded.occurrenceId]);

  const legal = await asUser(t, legalReaderId, (client) =>
    client.query(api.search.global, { termo: "bolota" }),
  );
  expect(legal[0]?.itens.map((item) => item.id)).toEqual([
    seeded.legalOccurrenceId,
    seeded.occurrenceId,
  ]);
});

test("global respeita o limite por tipo", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const storageId = await storeTestImage(t);

  for (let index = 0; index < 4; index += 1) {
    await asUser(t, adminId, (client) =>
      client.mutation(api.dogs.create, {
        microchip: `10000000000000${index}`,
        nome: `Bolota ${index}`,
        especie: "cao",
        sexo: "macho",
        porte: "medio",
        castrado: false,
        vacinas_em_dia: true,
        foto_perfil_storage_id: storageId,
      }),
    );
  }

  const groups = await asUser(t, adminId, (client) =>
    client.query(api.search.global, { termo: "bolota", limitePorTipo: 2 }),
  );

  expect(groups[0]?.itens).toHaveLength(2);
});
