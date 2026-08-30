import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { PublicReportConfirmationPage } from "@/app/pages/PublicReportConfirmationPage";

describe("PublicReportConfirmationPage", () => {
  it("mostra confirmação e o protocolo da denúncia", () => {
    render(
      <MemoryRouter
        initialEntries={["/denuncia/n57bp98yrnnj8rr9h188bygs4n8dew89/confirmacao"]}
      >
        <Routes>
          <Route
            element={<PublicReportConfirmationPage />}
            path="/denuncia/:id/confirmacao"
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Denúncia recebida")).toBeInTheDocument();
    // Protocolo curto e anotável, não o id de 32 caracteres.
    expect(screen.getByText("s4n8dew89".slice(-8))).toBeInTheDocument();
    expect(
      screen.queryByText("n57bp98yrnnj8rr9h188bygs4n8dew89"),
    ).not.toBeInTheDocument();
  });
});
