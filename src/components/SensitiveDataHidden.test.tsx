import { render, screen } from "@testing-library/react";

import { SensitiveDataHidden } from "@/components/SensitiveDataHidden";

describe("SensitiveDataHidden", () => {
  it("informa que dados sensiveis estao ocultos", () => {
    render(<SensitiveDataHidden />);
    expect(screen.getByText(/dados sensiveis ocultos/i)).toBeInTheDocument();
  });
});
