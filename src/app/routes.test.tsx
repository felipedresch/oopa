import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

import { appRoutes, router } from "@/app/routes";

describe("routes", () => {
  it("renderiza dashboard no layout autenticado", async () => {
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByLabelText("Navegacao inferior")).toBeInTheDocument();
  });

  it("renderiza rota de login no layout publico", async () => {
    const loginRouter = createMemoryRouter(appRoutes, {
      initialEntries: ["/login"],
    });

    render(<RouterProvider router={loginRouter} />);

    expect(await screen.findByRole("heading", { name: "Login" })).toBeInTheDocument();
  });
});
