import { FileTextIcon, LoaderCircleIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { useRef, useState } from "react";
import { useAction } from "convex/react";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";

const ACCEPTED_TYPES = ["application/xml", "text/xml", "application/pdf"];
const MAX_BYTES = 8 * 1024 * 1024;

type NfeSuggestion = {
  numero: string | null;
  data_emissao: number | null;
  valor_total: number | null;
};

type NotaFiscalUploadProps = {
  storageId?: Id<"_storage">;
  fileName?: string;
  onChange: (storageId: Id<"_storage"> | undefined, fileName: string | undefined) => void;
  onParsed: (suggestion: NfeSuggestion) => void;
};

export function NotaFiscalUpload({
  storageId,
  fileName,
  onChange,
  onParsed,
}: NotaFiscalUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, reset, isUploading, progress, error: uploadError } = usePhotoUpload();
  const parseNotaFiscal = useAction(api.appointments.parseNotaFiscal);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const handleFile = async (file: File) => {
    setLocalError(null);
    const isXml = ACCEPTED_TYPES.slice(0, 2).includes(file.type) || file.name.toLowerCase().endsWith(".xml");
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isXml && !isPdf) {
      setLocalError("Formato inválido. Envie um XML ou PDF de nota fiscal.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setLocalError("A nota fiscal deve ter no máximo 8 MB.");
      return;
    }

    const uploadedId = await upload(file);
    if (!uploadedId) {
      return;
    }

    onChange(uploadedId, file.name);
    if (!isXml) {
      setLocalError("PDF anexado. Preencha os dados da nota manualmente.");
      return;
    }

    setIsParsing(true);
    try {
      const parsed = await parseNotaFiscal({ storageId: uploadedId });
      onParsed({
        numero: parsed.numero,
        data_emissao: parsed.data_emissao,
        valor_total: parsed.valor_total,
      });
      if (!parsed.sucesso && parsed.mensagem) {
        setLocalError(parsed.mensagem);
      }
    } catch {
      setLocalError("Não foi possível ler o XML. Preencha os dados da nota manualmente.");
    } finally {
      setIsParsing(false);
    }
  };

  const remove = () => {
    reset();
    setLocalError(null);
    onChange(undefined, undefined);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor="nota-fiscal-upload">Nota fiscal (XML ou PDF)</Label>
      {storageId ? (
        <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileTextIcon aria-hidden="true" className="size-5" />
            </span>
            <span className="min-w-0 truncate text-sm font-medium">{fileName ?? "Nota fiscal anexada"}</span>
          </div>
          <Button className="min-h-10 shrink-0" onClick={remove} type="button" variant="ghost">
            <Trash2Icon aria-hidden="true" className="mr-2 size-4" />
            Remover
          </Button>
        </div>
      ) : (
        <button
          className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent/30"
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          <UploadIcon aria-hidden="true" className="size-7" />
          Selecionar XML ou PDF (até 8 MB)
        </button>
      )}
      <Input
        accept=".xml,.pdf,application/xml,text/xml,application/pdf"
        className="sr-only"
        id="nota-fiscal-upload"
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
        <div className="flex flex-col gap-1.5" role="status">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">Enviando nota fiscal…</p>
        </div>
      ) : null}
      {isParsing ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <LoaderCircleIcon aria-hidden="true" className="size-4 animate-spin" />
          Lendo dados da NFe…
        </p>
      ) : null}
      {uploadError ? <p className="text-sm text-destructive">{uploadError}</p> : null}
      {localError ? <p className="text-sm text-warning">{localError}</p> : null}
    </div>
  );
}
