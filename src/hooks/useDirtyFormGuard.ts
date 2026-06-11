import { useEffect } from "react";
import { useBlocker } from "react-router-dom";

const DEFAULT_MESSAGE =
  "Voce tem alteracoes nao salvas. Deseja sair mesmo assim?";

export function useDirtyFormGuard(
  isDirty: boolean,
  message: string = DEFAULT_MESSAGE,
): void {
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!isDirty) {
        return;
      }
      event.preventDefault();
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  useBlocker(({ currentLocation, nextLocation }) => {
    if (!isDirty || currentLocation.pathname === nextLocation.pathname) {
      return false;
    }
    return !window.confirm(message);
  });
}
