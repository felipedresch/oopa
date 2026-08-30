import { FileTextIcon, Trash2Icon } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";
import type { Id } from "../../convex/_generated/dataModel";

const ACCEPTED_TYPES = ["application/pdf"];
const MAX_BYTES = 8 * 1024 * 1024;

type PdfUploadProps = {
  label: string;
  storageId?: Id<"_storage">;
  required?: boolean;
  onChange: (storageId: Id<"_storage"> | undefined, fileName: string | null) => void;
};

export function PdfUpload({ label, storageId, required = false, onChange }: PdfUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, reset, error, isUploading } = usePhotoUpload();
  const [fileName, setFileName] = useState<string | null>(null);
  const [sizeError, setSizeError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setSizeError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setSizeError("Envie um arquivo PDF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setSizeError("O arquivo deve ter no máximo 8 MB.");
      return;
    }

    const uploadedId = await upload(file);
    if (uploadedId) {
      setFileName(file.name);
      onChange(uploadedId, file.name);
    }
  };

  const handleRemove = () => {
    setFileName(null);
    reset();
    onChange(undefined, null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor="pdf-upload">
        {label}
        {required ? " *" : ""}
      </Label>

      {storageId && fileName ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex min-h-11 flex-1 items-center gap-2 rounded-lg border bg-muted/30 px-3 text-sm">
            <FileTextIcon aria-hidden="true" className="size-4 shrink-0" />
            <span className="truncate">{fileName}</span>
          </div>
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
      ) : (
        <button
          className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-sm text-muted-foreground"
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          <FileTextIcon aria-hidden="true" className="size-6" />
          {isUploading ? "Enviando..." : "Selecionar PDF (até 8 MB)"}
        </button>
      )}

      <Input
        accept={ACCEPTED_TYPES.join(",")}
        className="sr-only"
        id="pdf-upload"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleFile(file);
          }
        }}
        ref={inputRef}
        type="file"
      />

      {sizeError ? <p className="text-sm text-destructive">{sizeError}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
