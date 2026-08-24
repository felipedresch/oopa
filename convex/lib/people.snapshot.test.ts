import { expect, test } from "vitest";

import { filterPersonSnapshotForViewer } from "./people";

test("filterPersonSnapshotForViewer oculta dados sensiveis", () => {
  const snapshot = {
    nome_completo: "Maria",
    cpf: "52998224725",
    telefone: "11999999999",
    bairro_id: undefined,
    bairro_nome: "Centro",
  };

  const filtered = filterPersonSnapshotForViewer(snapshot, ["occurrences.read"]);
  expect(filtered).toEqual({
    nome_completo: "Maria",
    bairro_id: undefined,
    bairro_nome: "Centro",
  });
});

test("filterPersonSnapshotForViewer mantem dados com people.read_sensitive", () => {
  const snapshot = {
    nome_completo: "Maria",
    cpf: "52998224725",
    telefone: "11999999999",
    bairro_nome: "Centro",
  };

  const filtered = filterPersonSnapshotForViewer(snapshot, ["people.read_sensitive"]);
  expect(filtered).toEqual(snapshot);
});
