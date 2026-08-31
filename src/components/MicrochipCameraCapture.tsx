import { CameraIcon, FolderOpenIcon, ScanLineIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 8 * 1024 * 1024;

type MicrochipCameraCaptureProps = {
  disabled?: boolean;
  onCapture: (file: File) => void;
};

function videoFrameToFile(video: HTMLVideoElement): Promise<File> {
  return new Promise((resolve, reject) => {
    if (!video.videoWidth || !video.videoHeight) {
      reject(new Error("A câmera ainda está iniciando. Aguarde um instante."));
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      reject(new Error("Não foi possível capturar a imagem da câmera."));
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Não foi possível capturar a imagem da câmera."));
          return;
        }
        resolve(
          new File([blob], `leitor-microchip-${Date.now()}.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now(),
          }),
        );
      },
      "image/jpeg",
      0.92,
    );
  });
}

export function MicrochipCameraCapture({
  disabled = false,
  onCapture,
}: MicrochipCameraCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [startingCamera, setStartingCamera] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraStream(null);
    setCameraOpen(false);
    setStartingCamera(false);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !cameraStream) {
      return;
    }
    video.srcObject = cameraStream;
    void video.play().catch(() => {
      setError("Não foi possível iniciar a visualização da câmera.");
    });
  }, [cameraStream]);

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  const startCamera = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("A câmera não está disponível neste navegador. Selecione uma foto dos arquivos.");
      return;
    }

    setCameraOpen(true);
    setStartingCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      setCameraStream(stream);
    } catch {
      setCameraOpen(false);
      setError(
        "Não foi possível acessar a câmera. Verifique a permissão do navegador ou selecione uma foto dos arquivos.",
      );
    } finally {
      setStartingCamera(false);
    }
  };

  const captureFrame = async () => {
    setError(null);
    const video = videoRef.current;
    if (!video) {
      setError("A câmera ainda está iniciando. Aguarde um instante.");
      return;
    }

    try {
      const file = await videoFrameToFile(video);
      stopCamera();
      onCapture(file);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível capturar a foto.");
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setError(null);
    if (!file) {
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Formato inválido. Selecione uma imagem JPEG, PNG ou WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("A imagem deve ter no máximo 8 MB.");
      return;
    }

    stopCamera();
    onCapture(file);
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-accent/50 p-4 sm:p-5">
      <Label>Foto do leitor RFID</Label>
      <p className="text-sm text-muted-foreground">
        Use a câmera ou escolha uma imagem. Enquadre somente o visor e evite reflexos.
      </p>

      <div
        className="relative mx-auto flex aspect-[4/3] w-full max-w-md items-center justify-center overflow-hidden rounded-xl bg-sidebar"
      >
        {cameraOpen ? (
          <video
            aria-label="Visualização da câmera"
            autoPlay
            className="absolute inset-0 size-full object-cover"
            muted
            playsInline
            ref={videoRef}
          />
        ) : (
          <span className="px-4 text-center text-sm font-medium tracking-widest text-sidebar-foreground tabular-nums">
            000 000 000 000 000
          </span>
        )}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-8 rounded-lg border-2 border-sidebar-primary/80"
        />
        {startingCamera ? (
          <span className="relative z-10 rounded-md bg-sidebar/80 px-3 py-2 text-sm text-sidebar-foreground">
            Iniciando câmera...
          </span>
        ) : null}
      </div>

      <input
        accept={ACCEPTED_TYPES.join(",")}
        aria-label="Selecionar foto dos arquivos"
        className="sr-only"
        disabled={disabled}
        onChange={handleFileChange}
        ref={fileInputRef}
        type="file"
      />

      {cameraOpen ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            className="min-h-12 text-base"
            disabled={disabled || startingCamera || !cameraStream}
            onClick={() => void captureFrame()}
            type="button"
          >
            <ScanLineIcon aria-hidden="true" className="mr-2 size-5" />
            Capturar imagem
          </Button>
          <Button
            className="min-h-12 text-base"
            disabled={disabled}
            onClick={stopCamera}
            type="button"
            variant="outline"
          >
            <XIcon aria-hidden="true" className="mr-2 size-5" />
            Fechar câmera
          </Button>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            className="min-h-12 text-base"
            disabled={disabled}
            onClick={() => void startCamera()}
            type="button"
          >
            <CameraIcon aria-hidden="true" className="mr-2 size-5" />
            Usar câmera
          </Button>
          <Button
            className="min-h-12 text-base"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            type="button"
            variant="outline"
          >
            <FolderOpenIcon aria-hidden="true" className="mr-2 size-5" />
            Selecionar arquivo
          </Button>
        </div>
      )}

      {error ? (
        <p className="text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
