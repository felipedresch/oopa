import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { TutorCard } from "@/components/TutorCard";

describe("TutorCard", () => {
  it("renderiza nome e bairro", () => {
    render(
      <MemoryRouter>
        <TutorCard bairroNome="Centro" nome="Maria Tutora" tutorId="tutor1" />
      </MemoryRouter>,
    );

    expect(screen.getByText("Maria Tutora")).toBeInTheDocument();
    expect(screen.getByText("Centro")).toBeInTheDocument();
  });

  it("mostra badge apenas com alerta", () => {
    render(
      <MemoryRouter>
        <TutorCard alertLevel="red" bairroNome={null} nome="Joao" tutorId="tutor2" />
      </MemoryRouter>,
    );

    expect(screen.getByText("Alerta alto")).toBeInTheDocument();
  });
});
