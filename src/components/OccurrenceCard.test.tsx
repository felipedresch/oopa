import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { OccurrenceCard } from "@/components/OccurrenceCard";

describe("OccurrenceCard", () => {
  it("renderiza tipo e descrição", () => {
    render(
      <MemoryRouter>
        <OccurrenceCard
          dataOcorrencia={Date.UTC(2024, 5, 10)}
          descricao="Consulta de rotina"
          dogId="dog1"
          gravidade="info"
          occurrenceId="occ1"
          typeNome="Consulta/Visualizacao"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Consulta/Visualizacao")).toBeInTheDocument();
    expect(screen.getByText("Consulta de rotina")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/dogs/dog1/occurrences/occ1",
    );
  });

  it("renderiza sem link e com aviso quando não há animal vinculado", () => {
    render(
      <MemoryRouter>
        <OccurrenceCard
          dataOcorrencia={Date.UTC(2024, 5, 10)}
          descricao="Denúncia recebida"
          gravidade="alta"
          occurrenceId="occ2"
          typeNome="Denúncia externa"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Sem animal vinculado")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
