import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { DogCard } from "@/components/DogCard";

describe("DogCard", () => {
  it("renderiza nome, microchip formatado e status", () => {
    render(
      <MemoryRouter>
        <DogCard
          dogId="dog123"
          microchip="123456789012345"
          nome="Thor"
          status="na_ong"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Thor")).toBeInTheDocument();
    expect(screen.getByText("123 456 789 012 345")).toBeInTheDocument();
    expect(screen.getByText("Na ONG")).toBeInTheDocument();
  });
});
