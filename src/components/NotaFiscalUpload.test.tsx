import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { NotaFiscalUpload } from "@/components/NotaFiscalUpload";

const mockUpload = vi.fn();
const mockParse = vi.fn();
const mockOnChange = vi.fn();
const mockOnParsed = vi.fn();

vi.mock("@/hooks/usePhotoUpload", () => ({
  usePhotoUpload: () => ({
    upload: mockUpload,
    reset: vi.fn(),
    isUploading: false,
    progress: 0,
    error: null,
  }),
}));

vi.mock("convex/react", () => ({
  useAction: () => mockParse,
}));

describe("NotaFiscalUpload", () => {
  beforeEach(() => {
    mockUpload.mockReset().mockResolvedValue("storage1");
    mockParse.mockReset().mockResolvedValue({
      sucesso: true,
      numero: "42",
      data_emissao: Date.UTC(2026, 7, 30),
      valor_total: 120.5,
      mensagem: null,
    });
    mockOnChange.mockReset();
    mockOnParsed.mockReset();
  });

  it("envia XML e propaga os dados sugeridos pelo parser", async () => {
    const user = userEvent.setup();
    render(<NotaFiscalUpload onChange={mockOnChange} onParsed={mockOnParsed} />);

    const file = new File(["<NFe />"], "nota.xml", { type: "application/xml" });
    await user.upload(screen.getByLabelText("Nota fiscal (XML ou PDF)"), file);

    expect(mockUpload).toHaveBeenCalledWith(file);
    expect(mockParse).toHaveBeenCalledWith({ storageId: "storage1" });
    expect(mockOnChange).toHaveBeenCalledWith("storage1", "nota.xml");
    expect(mockOnParsed).toHaveBeenCalledWith({
      numero: "42",
      data_emissao: Date.UTC(2026, 7, 30),
      valor_total: 120.5,
    });
  });

  it("rejeita arquivo maior que 8 MB antes do upload", async () => {
    const user = userEvent.setup();
    render(<NotaFiscalUpload onChange={mockOnChange} onParsed={mockOnParsed} />);

    const file = new File([new Uint8Array(8 * 1024 * 1024 + 1)], "nota.xml", {
      type: "application/xml",
    });
    await user.upload(screen.getByLabelText("Nota fiscal (XML ou PDF)"), file);

    expect(screen.getByText("A nota fiscal deve ter no máximo 8 MB.")).toBeInTheDocument();
    expect(mockUpload).not.toHaveBeenCalled();
  });
});
