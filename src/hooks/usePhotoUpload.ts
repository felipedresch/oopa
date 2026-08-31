import { useMutation } from "convex/react";
import { useCallback, useState } from "react";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { optimizeImageForUpload } from "@/lib/image-optimization";

type UploadState = "idle" | "uploading" | "success" | "error";

type UploadUrlMutation = typeof api.storage.createSignedUploadUrl;

export function usePhotoUpload(
  uploadUrlMutation: UploadUrlMutation = api.storage.createSignedUploadUrl,
) {
  const createSignedUploadUrl = useMutation(uploadUrlMutation);
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File): Promise<Id<"_storage"> | null> => {
      setState("uploading");
      setProgress(10);
      setError(null);

      try {
        const uploadFile = await optimizeImageForUpload(file);
        setProgress(25);
        const uploadUrl = await createSignedUploadUrl({});
        setProgress(40);

        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": uploadFile.type },
          body: uploadFile,
        });

        if (!response.ok) {
          throw new Error("Falha no envio da foto.");
        }

        const payload = (await response.json()) as { storageId: Id<"_storage"> };
        setProgress(100);
        setState("success");
        return payload.storageId;
      } catch (uploadError) {
        setState("error");
        setError(
          uploadError instanceof Error ? uploadError.message : "Não foi possível enviar a foto.",
        );
        return null;
      }
    },
    [createSignedUploadUrl],
  );

  const reset = useCallback(() => {
    setState("idle");
    setProgress(0);
    setError(null);
  }, []);

  return {
    upload,
    reset,
    state,
    progress,
    error,
    isUploading: state === "uploading",
  };
}
