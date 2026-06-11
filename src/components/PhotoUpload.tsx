import { ImagePlusIcon, Trash2Icon } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";
import type { Id } from "../../convex/_generated/dataModel";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 8 * 1024 * 1024;

type PhotoUploadProps = {
  label: string;
  storageId?: Id<"_storage">;
  previewUrl?: string | null;
  required?: boolean;
  onChange: (storageId: Id<"_storage"> | undefined, previewUrl: string | null) => void;
};

export function PhotoUpload({
  label,
  storageId,
  previewUrl,
  required = false,
  onChange,
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, reset, state, progress, error, isUploading } = usePhotoUpload();
  const [localPreview, setLocalPreview] = useState<string | null>(previewUrl ?? null);

  const handleFile = async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      reset();
      return;
    }
    if (file.size > MAX_BYTES) {
      reset();
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);

    const uploadedId = await upload(file);
    if (uploadedId) {
      onChange(uploadedId, objectUrl);
    } else {
      URL.revokeObjectURL(objectUrl);
      setLocalPreview(previewUrl ?? null);
    }
  };

  const handleRemove = () => {
    if (localPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(localPreview);
    }
    setLocalPreview(null);
    reset();
    onChange(undefined, null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor="photo-upload">
        {label}
        {required ? " *" : ""}
      </Label>

      {localPreview ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <img
            alt="Preview da foto"
            className="size-40 min-h-40 min-w-40 rounded-lg border object-cover"
            src={localPreview}
          />
          <div className="flex flex-col gap-2">
            <Button
              className="min-h-11"
              disabled={isUploading}
              onClick={() => inputRef.current?.click()}
              type="button"
              variant="outline"
            >
              Substituir foto
            </Button>
            <Button
              className="min-h-11"
              disabled={isUploading}
              onClick={handleRemove}
              type="button"
              variant="ghost"
            >
              <Trash2Icon aria-hidden="true" className="mr-2 size-4" />
              Remover
            </Button>
          </div>
        </div>
      ) : (
        <button
          className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-sm text-muted-foreground"
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          <ImagePlusIcon aria-hidden="true" className="size-8" />
          Selecionar JPEG, PNG ou WebP (ate 8 MB)
        </button>
      )}

      <Input
        accept={ACCEPTED_TYPES.join(",")}
        className="sr-only"
        id="photo-upload"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleFile(file);
          }
        }}
        ref={inputRef}
        type="file"
      />

      {isUploading ? (
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!storageId && required && state === "idle" && !localPreview ? (
        <p className="text-sm text-muted-foreground">Foto obrigatória para concluir o cadastro.</p>
      ) : null}
    </div>
  );
}
