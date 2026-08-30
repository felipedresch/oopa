import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { CastrationCard } from "@/components/CastrationCard";

describe("CastrationCard", () => {
  it("renderiza posição na fila, animal e status", () => {
    render(
      <MemoryRouter>
        <CastrationCard
          animalEspecie="cao"
          animalNome="Bolinha"
          castrationId="castration1"
          dataSolicitacao={Date.UTC(2024, 5, 10)}
          pessoaNome="Solicitante Teste"
          position={2}
          status="aguardando"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Bolinha · Cão")).toBeInTheDocument();
    expect(screen.getByText("Aguardando")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/castration/castration1");
  });
});
