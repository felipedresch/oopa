import { render, screen } from "@testing-library/react";

import { BairroWarningBanner } from "@/components/BairroWarningBanner";

describe("BairroWarningBanner", () => {
  it("exibe mensagem de warning de bairro", () => {
    render(
      <BairroWarningBanner message="Este cão já teve devolução associada a tutor deste bairro." />,
    );
    expect(screen.getByText(/devolução associada/i)).toBeInTheDocument();
  });
});
