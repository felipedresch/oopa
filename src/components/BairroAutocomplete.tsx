import { useQuery } from "convex/react";
import { useMemo, useState } from "react";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type BairroAutocompleteProps = {
  value?: Id<"bairros">;
  initialLabel?: string;
  onChange: (bairroId: Id<"bairros"> | undefined, label: string) => void;
  disabled?: boolean;
};

export function BairroAutocomplete({
  value,
  initialLabel = "",
  onChange,
  disabled = false,
}: BairroAutocompleteProps) {
  const [query, setQuery] = useState(initialLabel);
  const [open, setOpen] = useState(false);

  const options = useQuery(api.bairros.search, {
    prefix: query.trim() || undefined,
    limit: 20,
  });

  const selectedLabel = useMemo(() => {
    if (!value || !options) {
      return initialLabel;
    }
    return options.find((option) => option._id === value)?.nome ?? initialLabel;
  }, [initialLabel, options, value]);

  return (
    <div className="relative flex flex-col gap-2">
      <Label htmlFor="bairro-autocomplete">Bairro</Label>
      <Input
        autoComplete="off"
        disabled={disabled}
        id="bairro-autocomplete"
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          if (!event.target.value.trim()) {
            onChange(undefined, "");
          }
        }}
        onFocus={() => setOpen(true)}
        placeholder='Buscar bairro ou selecione "Não informado"'
        value={query || selectedLabel}
      />

      {open && options && options.length > 0 ? (
        <ul className="absolute top-full z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border bg-popover p-1 shadow-md">
          {options.map((option) => (
            <li key={option._id}>
              <button
                className="w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50"
                onMouseDown={(event) => {
                  event.preventDefault();
                  setQuery(option.nome);
                  onChange(option._id, option.nome);
                  setOpen(false);
                }}
                type="button"
              >
                {option.nome}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
