export async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function normalizeOcrContentType(file: File): "image/jpeg" | "image/png" {
  if (file.type === "image/jpeg" || file.type === "image/png") {
    return file.type;
  }
  throw new Error("Formato inválido para leitura. Use JPEG ou PNG.");
}
