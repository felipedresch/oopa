/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import { FIXTURE_DOG, FIXTURE_MICROCHIP } from "./testFixtures";
import { asUser, seedAdmin, storeTestImage } from "./testHelpers";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const baseDogInput = {
  nome: FIXTURE_DOG.nome,
  especie: "cao" as const,
  sexo: FIXTURE_DOG.sexo,
  porte: FIXTURE_DOG.porte,
  castrado: FIXTURE_DOG.castrado,
  vacinas_em_dia: FIXTURE_DOG.vacinas_em_dia,
};

test("create exige foto de perfil e microchip unico", async () => {
  const t = convexTest(schema, modules);
  const adminId = await seedAdmin(t);
  const storageId = await storeTestImage(t);

  await expect(
    asUser(t, adminId, async (client) => {
      await client.mutation(api.dogs.create, {
        ...baseDogInput,
        microchip: FIXTURE_MICROCHIP,
      } as never);
    }),
  ).rejects.toThrow();

  const dogId = await asUser(t, adminId, async (client) => {
    return await client.mutation(api.dogs.create, {
      ...baseDogInput,
      microchip: FIXTURE_MICROCHIP,
      foto_perfil_storage_id: storageId,
    });
  });

  expect(dogId).toBeTruthy();

  await expect(
    asUser(t, adminId, async (client) => {
      await client.mutation(api.dogs.create, {
        ...baseDogInput,
        microchip: FIXTURE_MICROCHIP,
        foto_perfil_storage_id: storageId,
      });
    }),
  ).rejects.toThrow(/microchip/i);
});

test("create grava especie gato e leitura preserva valor", async () => {
  const t = convexTest(schema, modules);
  const adminId = await seedAdmin(t);
  const storageId = await storeTestImage(t);
  const now = Date.now();

  const dogId = await asUser(t, adminId, async (client) => {
    return await client.mutation(api.dogs.create, {
      ...baseDogInput,
      especie: "gato",
      microchip: "222333444555666",
      foto_perfil_storage_id: storageId,
    });
  });

  const dog = await asUser(t, adminId, async (client) =>
    client.query(api.dogs.get, { dogId, now }),
  );

  expect(dog?.especie).toBe("gato");
});

test("microchipExists bloqueia microchip ja cadastrado", async () => {
  const t = convexTest(schema, modules);
  const adminId = await seedAdmin(t);
  const storageId = await storeTestImage(t);

  await asUser(t, adminId, async (client) => {
    await client.mutation(api.dogs.create, {
      ...baseDogInput,
      microchip: "333444555666777",
      foto_perfil_storage_id: storageId,
    });
  });

  const taken = await asUser(t, adminId, async (client) =>
    client.query(api.dogs.microchipExists, { microchip: "333444555666777" }),
  );
  expect(taken).toEqual({ exists: true, nome: FIXTURE_DOG.nome });

  const free = await asUser(t, adminId, async (client) =>
    client.query(api.dogs.microchipExists, { microchip: "999888777666555" }),
  );
  expect(free).toEqual({ exists: false, nome: null });

  const partial = await asUser(t, adminId, async (client) =>
    client.query(api.dogs.microchipExists, { microchip: "123" }),
  );
  expect(partial).toEqual({ exists: false, nome: null });
});

test("findByMicrochip retorna cao cadastrado", async () => {
  const t = convexTest(schema, modules);
  const adminId = await seedAdmin(t);
  const storageId = await storeTestImage(t);
  const now = Date.now();

  await asUser(t, adminId, async (client) => {
    await client.mutation(api.dogs.create, {
      ...baseDogInput,
      microchip: "987654321098765",
      foto_perfil_storage_id: storageId,
    });
  });

  const found = await asUser(t, adminId, async (client) =>
    client.query(api.dogs.findByMicrochip, {
      microchip: "987654321098765",
      now,
    }),
  );

  expect(found?.nome).toBe(FIXTURE_DOG.nome);
});

test("usuario sem dogs.read nao lista caes", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();
  const readerId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      nome: "Sem caes",
      name: "Sem caes",
      email: "semcaes@ong.local",
      organizacao: "ONG OOPA",
      ativo: true,
      permissions: ["templates.manage"],
      criado_em: now,
    });
  });

  await expect(
    asUser(t, readerId, async (client) =>
      client.query(api.dogs.list, { paginationOpts: { numItems: 10, cursor: null }, now }),
    ),
  ).rejects.toThrow();
});

test("limite de fotos adicionais por cao", async () => {
  const t = convexTest(schema, modules);
  const adminId = await seedAdmin(t);
  const profileStorageId = await storeTestImage(t);

  const dogId = await asUser(t, adminId, async (client) => {
    return await client.mutation(api.dogs.create, {
      ...baseDogInput,
      microchip: "111222333444555",
      foto_perfil_storage_id: profileStorageId,
    });
  });

  for (let index = 0; index < 20; index += 1) {
    const storageId = await storeTestImage(t);
    await asUser(t, adminId, async (client) => {
      await client.mutation(api.dogPhotos.add, {
        dogId,
        storageId,
      });
    });
  }

  const overflowStorageId = await storeTestImage(t);
  await expect(
    asUser(t, adminId, async (client) => {
      await client.mutation(api.dogPhotos.add, {
        dogId,
        storageId: overflowStorageId,
      });
    }),
  ).rejects.toThrow(/limite/i);
});
