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
      microchip: "333333333333333",
      nome: "Rex",
      especie: "cao",
      sexo: "macho",
      porte: "grande",
      castrado: true,
      vacinas_em_dia: true,
      foto_perfil_storage_id: storageId,
    }),
  );
}

test("create publica denuncia sem autenticacao e valida limites", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const bairroId = await seedBairro(t, "Centro");

  const reportId = await t.mutation(api.publicReports.create, {
    nome_denunciante: "Vizinho anônimo",
    contato: "(11) 99999-0000",
    tipo_denuncia: "maus_tratos",
    descricao: "Cão amarrado sem água há dias.",
    bairro_id: bairroId,
    local_descricao: "Esquina da rua principal",
    photo_storage_ids: [],
  });

  const report = await t.run(async (ctx) => ctx.db.get("public_reports", reportId));
  expect(report?.status).toBe("novo");
  expect(report?.nome_denunciante).toBe("Vizinho anônimo");

  await expect(
    t.mutation(api.publicReports.create, {
      tipo_denuncia: "outro",
      descricao: "",
      photo_storage_ids: [],
    }),
  ).rejects.toThrow(/Descrição/i);

  const storageIds = await Promise.all(
    Array.from({ length: 6 }, () => storeTestImage(t)),
  );
  await expect(
    t.mutation(api.publicReports.create, {
      tipo_denuncia: "outro",
      descricao: "Muitas fotos",
      photo_storage_ids: storageIds,
    }),
  ).rejects.toThrow(/no máximo/i);
});

test("createUploadUrl funciona sem autenticacao", async () => {
  const t = convexTest(schema, modules);
  const url = await t.mutation(api.publicReports.createUploadUrl, {});
  expect(typeof url).toBe("string");
  expect(url.length).toBeGreaterThan(0);
});

test("list exige public_reports.triage e filtra por status", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const readerId = await seedUser(t, {
    nome: "Leitor",
    email: "public-reports-reader@ong.local",
    permissions: ["occurrences.read"],
  });

  const novoId = await t.mutation(api.publicReports.create, {
    tipo_denuncia: "abandono",
    descricao: "Filhotes abandonados no terreno baldio.",
    photo_storage_ids: [],
  });
  const outroId = await t.mutation(api.publicReports.create, {
    tipo_denuncia: "animal_ferido",
    descricao: "Cachorro ferido na avenida.",
    photo_storage_ids: [],
  });
  await asUser(t, adminId, async (client) =>
    client.mutation(api.publicReports.archive, { publicReportId: outroId }),
  );

  await expect(
    asUser(t, readerId, async (client) => client.query(api.publicReports.list, {
      paginationOpts: { numItems: 10, cursor: null },
    })),
  ).rejects.toThrow();

  const asAdminAll = await asUser(t, adminId, async (client) =>
    client.query(api.publicReports.list, { paginationOpts: { numItems: 10, cursor: null } }),
  );
  expect(asAdminAll.page).toHaveLength(2);

  const asAdminNovo = await asUser(t, adminId, async (client) =>
    client.query(api.publicReports.list, {
      paginationOpts: { numItems: 10, cursor: null },
      status: "novo",
    }),
  );
  expect(asAdminNovo.page).toHaveLength(1);
  expect(asAdminNovo.page[0]?._id).toBe(novoId);
});

test("convertToOccurrence cria ocorrencia com dog_id opcional e marca denuncia convertida", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const storageId = await storeTestImage(t);

  const reportId = await t.mutation(api.publicReports.create, {
    tipo_denuncia: "maus_tratos",
    descricao: "Denúncia de maus-tratos recebida pelo portal.",
    photo_storage_ids: [storageId],
  });

  const occurrenceId = await asUser(t, adminId, async (client) =>
    client.mutation(api.publicReports.convertToOccurrence, { publicReportId: reportId }),
  );

  const occurrence = await asUser(t, adminId, async (client) =>
    client.query(api.occurrences.get, { occurrenceId }),
  );
  expect(occurrence?.dog_id).toBeUndefined();
  expect(occurrence?.categoria).toBe("denuncia_externa");
  expect(occurrence?.photos).toHaveLength(1);

  const report = await t.run(async (ctx) => ctx.db.get("public_reports", reportId));
  expect(report?.status).toBe("convertido");
  expect(report?.occurrence_id_gerada).toBe(occurrenceId);

  await expect(
    asUser(t, adminId, async (client) =>
      client.mutation(api.publicReports.convertToOccurrence, { publicReportId: reportId }),
    ),
  ).rejects.toThrow(/já convertida/i);
});

test("convertToOccurrence aceita dogId e exige permissao", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const dogId = await seedDog(t, adminId);
  const readerId = await seedUser(t, {
    nome: "Sem triagem",
    email: "sem-triagem@ong.local",
    permissions: ["occurrences.read"],
  });

  const reportId = await t.mutation(api.publicReports.create, {
    tipo_denuncia: "animal_ferido",
    descricao: "Animal ferido identificado como Rex.",
    photo_storage_ids: [],
  });

  await expect(
    asUser(t, readerId, async (client) =>
      client.mutation(api.publicReports.convertToOccurrence, { publicReportId: reportId }),
    ),
  ).rejects.toThrow();

  const occurrenceId = await asUser(t, adminId, async (client) =>
    client.mutation(api.publicReports.convertToOccurrence, { publicReportId: reportId, dogId }),
  );

  const occurrence = await asUser(t, adminId, async (client) =>
    client.query(api.occurrences.get, { occurrenceId }),
  );
  expect(occurrence?.dog_id).toBe(dogId);
});

test("archive marca denuncia arquivada e bloqueia arquivar denuncia convertida", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);

  const archivableId = await t.mutation(api.publicReports.create, {
    tipo_denuncia: "outro",
    descricao: "Denúncia sem relevância comprovada.",
    photo_storage_ids: [],
  });

  await asUser(t, adminId, async (client) =>
    client.mutation(api.publicReports.archive, { publicReportId: archivableId }),
  );
  const archived = await t.run(async (ctx) => ctx.db.get("public_reports", archivableId));
  expect(archived?.status).toBe("arquivado");

  const convertedId = await t.mutation(api.publicReports.create, {
    tipo_denuncia: "outro",
    descricao: "Denúncia que será convertida.",
    photo_storage_ids: [],
  });
  await asUser(t, adminId, async (client) =>
    client.mutation(api.publicReports.convertToOccurrence, { publicReportId: convertedId }),
  );

  await expect(
    asUser(t, adminId, async (client) =>
      client.mutation(api.publicReports.archive, { publicReportId: convertedId }),
    ),
  ).rejects.toThrow(/já convertida/i);
});
