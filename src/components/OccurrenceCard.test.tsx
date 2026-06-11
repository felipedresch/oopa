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
  });
});
