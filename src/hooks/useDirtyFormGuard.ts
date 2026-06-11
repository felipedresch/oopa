import { useEffect } from "react";
import { useBlocker, type Blocker } from "react-router-dom";

export const UNSAVED_CHANGES_MESSAGE =
  "Você tem alterações não salvas. Deseja sair mesmo assim?";

export function useDirtyFormGuard(isDirty: boolean): Blocker {
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

  return useBlocker(({ currentLocation, nextLocation }) => {
    if (!isDirty || currentLocation.pathname === nextLocation.pathname) {
      return false;
    }
    return true;
  });
}
