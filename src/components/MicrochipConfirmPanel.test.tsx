import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MicrochipConfirmPanel } from "@/components/MicrochipConfirmPanel";

describe("MicrochipConfirmPanel", () => {
  it("exige 15 dígitos para confirmar", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <MicrochipConfirmPanel
        onChange={() => undefined}
        onConfirm={onConfirm}
        value="123"
        warning="Não consegui ler com segurança"
      />,
    );

    expect(screen.getByText(/não consegui ler com segurança/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /confirmar e buscar/i }));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
