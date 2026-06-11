import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MicrochipConfirmPanel } from "@/components/MicrochipConfirmPanel";

describe("MicrochipConfirmPanel", () => {
  it("exige 15 digitos para confirmar", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <MicrochipConfirmPanel
        onChange={() => undefined}
        onConfirm={onConfirm}
        value="123"
        warning="Nao consegui ler com seguranca"
      />,
    );

    expect(screen.getByText(/nao consegui ler com seguranca/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /confirmar e buscar/i }));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
