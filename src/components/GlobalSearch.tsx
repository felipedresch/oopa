import { useQuery } from "convex/react";
import { SearchIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../../convex/_generated/api";
import { cn } from "@/lib/utils";

/** Termo mínimo aceito por `search.global`; espelhado aqui para não consultar à toa. */
const MIN_TERM_LENGTH = 2;
const DEBOUNCE_MS = 250;

type GlobalSearchProps = {
  /** `sidebar` usa as cores escuras da barra lateral; `header` usa as do app. */
  variant?: "sidebar" | "header";
  className?: string;
};

export function GlobalSearch({ variant = "header", className }: GlobalSearchProps) {
  const navigate = useNavigate();
  const inputId = useId();
  const [term, setTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [open, setOpen] = useState(false);
  const blurTimeout = useRef<number | undefined>(undefined);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedTerm(term.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [term]);

  useEffect(() => () => window.clearTimeout(blurTimeout.current), []);

  const groups = useQuery(
    api.search.global,
    debouncedTerm.length >= MIN_TERM_LENGTH ? { termo: debouncedTerm } : "skip",
  );

  const showPanel = open && term.trim().length >= MIN_TERM_LENGTH;
  const isSidebar = variant === "sidebar";

  const select = (rota: string) => {
    window.clearTimeout(blurTimeout.current);
    setTerm("");
    setDebouncedTerm("");
    setOpen(false);
    void navigate(rota);
  };

  return (
    <div className={cn("relative", className)}>
      <label className="sr-only" htmlFor={inputId}>
        Busca global
      </label>
      <SearchIcon
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2",
          isSidebar ? "text-sidebar-foreground/60" : "text-muted-foreground",
        )}
      />
      <input
        autoComplete="off"
        className={cn(
          "h-11 w-full rounded-lg border pr-3 pl-9 text-sm outline-none transition-colors focus-visible:ring-3",
          isSidebar
            ? "border-sidebar-border bg-sidebar-accent/40 text-sidebar-foreground placeholder:text-sidebar-foreground/60 focus-visible:ring-sidebar-ring/50"
            : "border-input bg-card placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50",
        )}
        id={inputId}
        onBlur={() => {
          blurTimeout.current = window.setTimeout(() => setOpen(false), 150);
        }}
        onChange={(event) => {
          setTerm(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="Buscar animais, pessoas, ocorrências..."
        type="search"
        value={term}
      />

      {showPanel ? (
        <div className="absolute top-full right-0 left-0 z-50 mt-1 max-h-80 overflow-auto rounded-xl border bg-popover p-2 text-popover-foreground shadow-md">
          {groups === undefined ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Buscando...</p>
          ) : groups.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              Nenhum resultado para “{term.trim()}”.
            </p>
          ) : (
            groups.map((group) => (
              <div className="py-1" key={group.tipo}>
                <p className="px-2 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {group.label}
                </p>
                <ul>
                  {group.itens.map((item) => (
                    <li key={item.id}>
                      <button
                        className="flex min-h-11 w-full flex-col items-start rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => select(item.rota)}
                        type="button"
                      >
                        <span className="text-sm font-medium">{item.titulo}</span>
                        {item.subtitulo ? (
                          <span className="line-clamp-1 text-xs text-muted-foreground">
                            {item.subtitulo}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
