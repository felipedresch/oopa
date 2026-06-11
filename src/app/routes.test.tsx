import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

import { appRoutes } from "@/app/routes";

describe("routes", () => {
  it("renderiza login no layout publico", async () => {
    const loginRouter = createMemoryRouter(appRoutes, {
      initialEntries: ["/login"],
    });

    render(<RouterProvider router={loginRouter} />);

    expect(await screen.findByRole("heading", { name: /entrar no oopa/i })).toBeInTheDocument();
  });

  it("redireciona dashboard não autenticado para login", async () => {
    const router = createMemoryRouter(appRoutes, { initialEntries: ["/"] });
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: /entrar no oopa/i })).toBeInTheDocument();
  });
});
