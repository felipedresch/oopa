import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider, useNavigate } from "react-router-dom";

import { useDirtyFormGuard } from "@/hooks/useDirtyFormGuard";

function DirtyForm({ allowOnSave }: { allowOnSave: boolean }) {
  const navigate = useNavigate();
  const { blocker, allowNavigation } = useDirtyFormGuard(true);

  return (
    <div>
      <button
        onClick={() => {
          if (allowOnSave) {
            allowNavigation();
          }
          void navigate("/destino");
        }}
        type="button"
      >
        Salvar
      </button>
      {blocker.state === "blocked" ? <p>alterações não salvas</p> : null}
    </div>
  );
}

function renderWithRouter(allowOnSave: boolean) {
  const router = createMemoryRouter(
    [
      { path: "/", element: <DirtyForm allowOnSave={allowOnSave} /> },
      { path: "/destino", element: <p>Página de destino</p> },
    ],
    { initialEntries: ["/"] },
  );
  render(<RouterProvider router={router} />);
}

describe("useDirtyFormGuard", () => {
  it("bloqueia a navegação quando o formulário está sujo", async () => {
    const user = userEvent.setup();
    renderWithRouter(false);

    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(screen.getByText("alterações não salvas")).toBeInTheDocument();
    expect(screen.queryByText("Página de destino")).not.toBeInTheDocument();
  });

  it("permite navegar após allowNavigation, sem bloquear", async () => {
    const user = userEvent.setup();
    renderWithRouter(true);

    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Página de destino")).toBeInTheDocument();
    expect(screen.queryByText("alterações não salvas")).not.toBeInTheDocument();
  });
});
