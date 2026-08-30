import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import type { Id } from "../../convex/_generated/dataModel";
import { MedicalRecordTimeline } from "@/components/MedicalRecordTimeline";

const mockUsePermissions = vi.fn();
const mockUsePaginatedQuery = vi.fn();

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: (): ReturnType<typeof mockUsePermissions> => mockUsePermissions(),
}));

vi.mock("convex/react", () => ({
  usePaginatedQuery: (): ReturnType<typeof mockUsePaginatedQuery> => mockUsePaginatedQuery(),
}));

describe("MedicalRecordTimeline", () => {
  beforeEach(() => {
    mockUsePermissions.mockReturnValue({ can: () => true });
    mockUsePaginatedQuery.mockReturnValue({
      results: [
        {
          _id: "record1",
          appointment_id: "appointment1",
          data_atendimento: Date.UTC(2026, 7, 30),
          tipo: "consulta",
          veterinario: { _id: "vet1", nome: "Dra. Ana", email: undefined },
          anamnese: undefined,
          diagnostico: "Saudável",
          procedimentos: "Avaliação clínica",
          medicamentos: undefined,
          peso_kg: 10,
          temperatura_c: undefined,
          anexos_urls: [],
        },
      ],
      status: "Exhausted",
      loadMore: vi.fn(),
    });
  });

  it("mostra a linha do tempo do prontuário e link do atendimento", () => {
    render(
      <MemoryRouter>
        <MedicalRecordTimeline dogId={"dog1" as Id<"dogs">} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Consulta")).toBeInTheDocument();
    expect(screen.getByText("Saudável")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver atendimento/ })).toHaveAttribute(
      "href",
      "/appointments/appointment1",
    );
  });
});
