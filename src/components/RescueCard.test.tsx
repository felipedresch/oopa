import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { RescueCard } from "@/components/RescueCard";

describe("RescueCard", () => {
  it("renderiza tipo, gravidade e status", () => {
    render(
      <MemoryRouter>
        <RescueCard
          bairroNome="Centro"
          criadoEm={Date.UTC(2024, 5, 10)}
          descricao="Cão atropelado na avenida."
          gravidade="alta"
          rescueId="rescue1"
          status="aberta"
          tipo="atropelado"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("atropelado")).toBeInTheDocument();
    expect(screen.getByText("Alta")).toBeInTheDocument();
    expect(screen.getByText("Aberta")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/rescues/rescue1");
  });
});
