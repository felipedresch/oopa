import { render, screen } from "@testing-library/react";

import { DogStatusBadge } from "@/components/DogStatusBadge";
import { SeverityBadge } from "@/components/SeverityBadge";
import { TutorAlertBadge } from "@/components/TutorAlertBadge";

describe("badges de dominio", () => {
  it("renderiza status do cão", () => {
    render(<DogStatusBadge status="adotado" />);
    expect(screen.getByText("Adotado")).toBeInTheDocument();
  });

  it("renderiza gravidade", () => {
    render(<SeverityBadge severity="media" />);
    expect(screen.getByText("Média")).toBeInTheDocument();
  });

  it("oculta alerta quando tutor não tem alerta", () => {
    const { container } = render(<TutorAlertBadge level="none" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza alerta do tutor", () => {
    render(<TutorAlertBadge level="red" />);
    expect(screen.getByText("Alerta alto")).toBeInTheDocument();
  });
});
