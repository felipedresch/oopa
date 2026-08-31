import { afterEach, describe, expect, it, vi } from "vitest";

import { optimizeImageForUpload } from "@/lib/image-optimization";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mockCanvas(outputSize: number, outputType?: string) {
  const drawImage = vi.fn();
  const context = {
    drawImage,
    imageSmoothingEnabled: false,
    imageSmoothingQuality: "low",
  } as unknown as CanvasRenderingContext2D;

  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback, type) => {
    callback(new Blob([new Uint8Array(outputSize)], { type: outputType ?? type ?? "image/png" }));
  });

  return { context, drawImage };
}

function mockBitmap(width: number, height: number) {
  const close = vi.fn();
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn().mockResolvedValue({ close, height, width }),
  );
  return { close };
}

describe("optimizeImageForUpload", () => {
  it("ignora arquivos que não são imagens", async () => {
    const file = new File(["nota"], "nota.xml", { type: "application/xml" });

    await expect(optimizeImageForUpload(file)).resolves.toBe(file);
  });

  it("redimensiona fotos grandes e envia o resultado recomprimido", async () => {
    const file = new File([new Uint8Array(2_000_000)], "animal.jpeg", {
      type: "image/jpeg",
    });
    const { close } = mockBitmap(4000, 3000);
    const { drawImage } = mockCanvas(500_000, "image/jpeg");

    const optimized = await optimizeImageForUpload(file);

    expect(optimized).not.toBe(file);
    expect(optimized.type).toBe("image/jpeg");
    expect(optimized.name).toBe("animal.jpg");
    expect(optimized.size).toBe(500_000);
    expect(drawImage).toHaveBeenCalledWith(
      expect.objectContaining({ width: 4000, height: 3000 }),
      0,
      0,
      2400,
      1800,
    );
    expect(close).toHaveBeenCalledOnce();
  });

  it("preserva uma imagem já mais eficiente quando a recompressão não reduz o arquivo", async () => {
    const file = new File([new Uint8Array(1000)], "pequena.webp", {
      type: "image/webp",
    });
    mockBitmap(1200, 900);
    mockCanvas(2000, "image/webp");

    await expect(optimizeImageForUpload(file)).resolves.toBe(file);
  });
});
