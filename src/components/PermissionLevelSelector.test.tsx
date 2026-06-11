import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PermissionLevelSelector } from "@/components/PermissionLevelSelector";
import { createEmptyModuleMap } from "@/lib/permissions";

describe("PermissionLevelSelector", () => {
  it("permite alterar nivel de um modulo", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const value = createEmptyModuleMap();

    render(<PermissionLevelSelector onChange={onChange} value={value} />);

    await user.click(screen.getAllByRole("button", { name: "Leitura" })[0]);

    expect(onChange).toHaveBeenCalledWith({
      ...value,
      dogs: "read",
    });
  });
});
