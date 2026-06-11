import type { ModulePermissionMap, PermissionLevel, UiModule } from "@/lib/permissions";
import {
  PERMISSION_LEVEL_DESCRIPTIONS,
  PERMISSION_LEVEL_LABELS,
  PERMISSION_LEVELS,
  UI_MODULES,
  UI_MODULE_LABELS,
} from "@/lib/permissions";
import { cn } from "@/lib/utils";

type PermissionLevelSelectorProps = {
  value: ModulePermissionMap;
  onChange: (next: ModulePermissionMap) => void;
  disabled?: boolean;
};

export function PermissionLevelSelector({
  value,
  onChange,
  disabled = false,
}: PermissionLevelSelectorProps) {
  const setLevel = (module: UiModule, level: PermissionLevel) => {
    onChange({ ...value, [module]: level });
  };

  return (
    <div className="divide-y divide-border">
      {UI_MODULES.map((module) => (
        <section className="flex flex-col gap-2.5 py-4 first:pt-0 last:pb-0" key={module}>
          <div>
            <h3 className="text-sm font-semibold">{UI_MODULE_LABELS[module]}</h3>
            <p className="text-xs text-muted-foreground">
              {PERMISSION_LEVEL_DESCRIPTIONS[value[module]]}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 sm:grid-cols-4">
            {PERMISSION_LEVELS.map((level) => {
              const isSelected = value[module] === level;
              return (
                <button
                  aria-pressed={isSelected}
                  className={cn(
                    "min-h-10 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    isSelected
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                    disabled && "pointer-events-none opacity-50",
                  )}
                  disabled={disabled}
                  key={level}
                  onClick={() => setLevel(module, level)}
                  type="button"
                >
                  {PERMISSION_LEVEL_LABELS[level]}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
