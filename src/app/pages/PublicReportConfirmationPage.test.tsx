import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { PublicReportConfirmationPage } from "@/app/pages/PublicReportConfirmationPage";

describe("PublicReportConfirmationPage", () => {
  it("mostra confirmação e o protocolo da denúncia", () => {
    render(
      <MemoryRouter initialEntries={["/denuncia/report123/confirmacao"]}>
        <Routes>
          <Route
            element={<PublicReportConfirmationPage />}
            path="/denuncia/:id/confirmacao"
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Denúncia recebida")).toBeInTheDocument();
    expect(screen.getByText("report123")).toBeInTheDocument();
  });
});
