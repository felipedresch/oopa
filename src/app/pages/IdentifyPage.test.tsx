import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IdentifyPage } from "@/app/pages/IdentifyPage";

const mockUsePermissions = vi.fn();
const mockUseQuery = vi.fn();
const mockUseAction = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: (): ReturnType<typeof mockUsePermissions> => mockUsePermissions(),
}));

vi.mock("convex/react", () => ({
  useQuery: (): ReturnType<typeof mockUseQuery> => mockUseQuery(),
  useAction: (): ReturnType<typeof mockUseAction> => mockUseAction(),
  useMutation: (): ReturnType<typeof mockUseMutation> => mockUseMutation(),
}));

describe("IdentifyPage", () => {
  beforeEach(() => {
    mockUsePermissions.mockReturnValue({
      can: (permission: string) =>
        permission === "dogs.read" || permission === "dogs.create",
    });
    mockUseQuery.mockReturnValue(undefined);
    mockUseAction.mockReturnValue(
      vi.fn().mockResolvedValue({
        candidate: "956000013141707",
        confidence: 0.94,
        needsManualReview: true,
      }),
    );
    mockUseMutation.mockReturnValue(vi.fn());
  });

  it("mostra campo manual e etapa de confirmacao", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <IdentifyPage />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/microchip manual/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/microchip manual/i), "956000013141707");
    await user.click(screen.getByRole("button", { name: /revisar numero/i }));

    expect(screen.getByText(/confira o numero antes de buscar/i)).toBeInTheDocument();
  });
});
