import { render, screen } from "@testing-library/react";

import { DogStatusBadge } from "@/components/DogStatusBadge";
import { SeverityBadge } from "@/components/SeverityBadge";
import { PersonAlertBadge } from "@/components/PersonAlertBadge";

describe("badges de dominio", () => {
  it("renderiza status do cão", () => {
    render(<DogStatusBadge status="adotado" />);
    expect(screen.getByText("Adotado")).toBeInTheDocument();
  });

  it("renderiza gravidade", () => {
    render(<SeverityBadge severity="media" />);
    expect(screen.getByText("Média")).toBeInTheDocument();
  });

  it("oculta alerta quando pessoa não tem alerta", () => {
    const { container } = render(<PersonAlertBadge level="none" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza alerta da pessoa", () => {
    render(<PersonAlertBadge level="red" />);
    expect(screen.getByText("Alerta alto")).toBeInTheDocument();
  });
});
