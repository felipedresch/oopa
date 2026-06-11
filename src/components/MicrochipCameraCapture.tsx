import { CameraIcon } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 8 * 1024 * 1024;

type MicrochipCameraCaptureProps = {
  disabled?: boolean;
  onCapture: (file: File) => void;
};

export function MicrochipCameraCapture({
  disabled = false,
  onCapture,
}: MicrochipCameraCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type) || file.size > MAX_BYTES) {
      return;
    }

    onCapture(file);
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-accent/50 p-4 sm:p-5">
      <Label>Foto do leitor RFID</Label>
      <p className="text-sm text-muted-foreground">
        Enquadre os 15 dígitos na moldura central e capture com boa iluminação.
      </p>

      <div
        aria-hidden="true"
        className="relative mx-auto flex aspect-[4/3] w-full max-w-md items-center justify-center overflow-hidden rounded-xl bg-sidebar"
      >
        <div className="absolute inset-8 rounded-lg border-2 border-sidebar-primary/80" />
        <span className="relative z-10 px-4 text-center text-sm font-medium tracking-widest text-sidebar-foreground tabular-nums">
          000 000 000 000 000
        </span>
      </div>

      <input
        accept={ACCEPTED_TYPES.join(",")}
        capture="environment"
        className="sr-only"
        disabled={disabled}
        id="microchip-camera-input"
        onChange={handleChange}
        ref={inputRef}
        type="file"
      />

      <Button
        className="min-h-12 w-full text-base"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        <CameraIcon aria-hidden="true" className="mr-2 size-5" />
        Capturar foto do leitor
      </Button>
    </div>
  );
}
