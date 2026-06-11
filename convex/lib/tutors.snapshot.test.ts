import { expect, test } from "vitest";

import { filterTutorSnapshotForViewer } from "./tutors";

test("filterTutorSnapshotForViewer oculta dados sensiveis", () => {
  const snapshot = {
    nome_completo: "Maria",
    cpf: "52998224725",
    telefone: "11999999999",
    bairro_id: undefined,
    bairro_nome: "Centro",
  };

  const filtered = filterTutorSnapshotForViewer(snapshot, ["occurrences.read"]);
  expect(filtered).toEqual({
    nome_completo: "Maria",
    bairro_id: undefined,
    bairro_nome: "Centro",
  });
});

test("filterTutorSnapshotForViewer mantem dados com tutors.read_sensitive", () => {
  const snapshot = {
    nome_completo: "Maria",
    cpf: "52998224725",
    telefone: "11999999999",
    bairro_nome: "Centro",
  };

  const filtered = filterTutorSnapshotForViewer(snapshot, ["tutors.read_sensitive"]);
  expect(filtered).toEqual(snapshot);
});
