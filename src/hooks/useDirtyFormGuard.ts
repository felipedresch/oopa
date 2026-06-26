import { useCallback, useEffect, useRef } from "react";
import { useBlocker, type Blocker } from "react-router-dom";

export const UNSAVED_CHANGES_MESSAGE =
  "Você tem alterações não salvas. Deseja sair mesmo assim?";

export type DirtyFormGuard = {
  blocker: Blocker;
  /**
   * Libera a próxima navegação sem disparar o diálogo de alterações não salvas.
   * Deve ser chamado de forma síncrona logo antes de `navigate()` após salvar,
   * pois o `useBlocker` lê o estado do render anterior e `setState` não surte
   * efeito a tempo.
   */
  allowNavigation: () => void;
};

export function useDirtyFormGuard(isDirty: boolean): DirtyFormGuard {
  // Ref lido em tempo real pelo blocker, contornando o atraso de re-render.
  const bypassRef = useRef(false);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!isDirty || bypassRef.current) {
        return;
      }
      event.preventDefault();
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (bypassRef.current || !isDirty || currentLocation.pathname === nextLocation.pathname) {
      return false;
    }
    return true;
  });

  const allowNavigation = useCallback(() => {
    bypassRef.current = true;
  }, []);

  return { blocker, allowNavigation };
}
