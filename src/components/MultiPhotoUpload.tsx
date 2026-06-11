import { ImagePlusIcon, Trash2Icon } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";
import type { Id } from "../../convex/_generated/dataModel";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 8 * 1024 * 1024;

type UploadedPhoto = {
  storageId: Id<"_storage">;
  previewUrl: string;
};

type MultiPhotoUploadProps = {
  label: string;
  photos: UploadedPhoto[];
  required?: boolean;
  onChange: (photos: UploadedPhoto[]) => void;
};

export function MultiPhotoUpload({
  label,
  photos,
  required = false,
  onChange,
}: MultiPhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading, error } = usePhotoUpload();

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList) {
      return;
    }

    const next = [...photos];
    for (const file of Array.from(fileList)) {
      if (!ACCEPTED_TYPES.includes(file.type) || file.size > MAX_BYTES) {
        continue;
      }
      const previewUrl = URL.createObjectURL(file);
      const storageId = await upload(file);
      if (storageId) {
        next.push({ storageId, previewUrl });
      } else {
        URL.revokeObjectURL(previewUrl);
      }
    }
    onChange(next);
  };

  const removePhoto = (index: number) => {
    const target = photos[index];
    if (target?.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(target.previewUrl);
    }
    onChange(photos.filter((_, photoIndex) => photoIndex !== index));
  };

  return (
    <div className="flex flex-col gap-3">
      <Label>
        {label}
        {required ? " *" : ""}
      </Label>

      <div className="flex flex-wrap gap-3">
        {photos.map((photo, index) => (
          <div className="relative" key={photo.storageId}>
            <img
              alt={`Foto ${index + 1}`}
              className="size-24 rounded-lg border object-cover"
              src={photo.previewUrl}
            />
            <Button
              className="absolute -right-2 -top-2 size-8 rounded-full p-0"
              onClick={() => removePhoto(index)}
              size="sm"
              type="button"
              variant="outline"
            >
              <Trash2Icon aria-hidden="true" className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      <div>
        <input
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          multiple
          onChange={(event) => {
            void handleFiles(event.target.files);
            event.target.value = "";
          }}
          ref={inputRef}
          type="file"
        />
        <Button
          className="min-h-11"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          type="button"
          variant="outline"
        >
          <ImagePlusIcon aria-hidden="true" className="mr-2 size-4" />
          {isUploading ? "Enviando..." : "Adicionar fotos"}
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
