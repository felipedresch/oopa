import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { PersonCard } from "@/components/PersonCard";

describe("PersonCard", () => {
  it("renderiza nome e bairro", () => {
    render(
      <MemoryRouter>
        <PersonCard bairroNome="Centro" nome="Maria Tutora" personId="person1" />
      </MemoryRouter>,
    );

    expect(screen.getByText("Maria Tutora")).toBeInTheDocument();
    expect(screen.getByText("Centro")).toBeInTheDocument();
  });

  it("mostra badge apenas com alerta", () => {
    render(
      <MemoryRouter>
        <PersonCard alertLevel="red" bairroNome={null} nome="Joao" personId="person2" />
      </MemoryRouter>,
    );

    expect(screen.getByText("Alerta alto")).toBeInTheDocument();
  });
});
