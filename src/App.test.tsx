import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

import { appRoutes } from "@/app/routes";

describe("App", () => {
  it("renderiza a tela de login nas rotas publicas", async () => {
    const router = createMemoryRouter(appRoutes, { initialEntries: ["/login"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /entrar no oopa/i }),
    ).toBeInTheDocument();
  });
});
