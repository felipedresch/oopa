import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MicrochipCameraCapture } from "@/components/MicrochipCameraCapture";

const originalMediaDevices = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");

afterEach(() => {
  vi.restoreAllMocks();
  if (originalMediaDevices) {
    Object.defineProperty(navigator, "mediaDevices", originalMediaDevices);
  } else {
    Reflect.deleteProperty(navigator, "mediaDevices");
  }
});

describe("MicrochipCameraCapture", () => {
  it("oferece câmera e arquivos como origens separadas", async () => {
    const user = userEvent.setup();
    const onCapture = vi.fn();
    render(<MicrochipCameraCapture onCapture={onCapture} />);

    expect(screen.getByRole("button", { name: /usar câmera/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /selecionar arquivo/i })).toBeInTheDocument();

    const input = screen.getByLabelText(/selecionar foto dos arquivos/i);
    expect(input).not.toHaveAttribute("capture");

    const file = new File(["photo"], "leitor.webp", { type: "image/webp" });
    await user.upload(input, file);

    expect(onCapture).toHaveBeenCalledWith(file);
  });

  it("abre a câmera traseira, captura um quadro e encerra o stream", async () => {
    const user = userEvent.setup();
    const onCapture = vi.fn();
    const stop = vi.fn();
    const stream = {
      getTracks: () => [{ stop }],
    } as unknown as MediaStream;
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();

    render(<MicrochipCameraCapture onCapture={onCapture} />);
    await user.click(screen.getByRole("button", { name: /usar câmera/i }));

    expect(getUserMedia).toHaveBeenCalledWith({
      audio: false,
      video: { facingMode: { ideal: "environment" } },
    });

    const video = await screen.findByLabelText(/visualização da câmera/i);
    Object.defineProperty(video, "videoWidth", { configurable: true, value: 1280 });
    Object.defineProperty(video, "videoHeight", { configurable: true, value: 720 });
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
      callback(new Blob(["captured"], { type: "image/jpeg" }));
    });

    const captureButton = screen.getByRole("button", { name: /capturar imagem/i });
    await waitFor(() => expect(captureButton).toBeEnabled());
    await user.click(captureButton);

    await waitFor(() => expect(onCapture).toHaveBeenCalledOnce());
    const captured: unknown = onCapture.mock.calls[0]?.[0];
    expect(captured).toBeInstanceOf(File);
    if (!(captured instanceof File)) {
      throw new Error("A captura não retornou um arquivo.");
    }
    expect(captured.type).toBe("image/jpeg");
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 1280, 720);
    expect(stop).toHaveBeenCalledOnce();
  });
});
