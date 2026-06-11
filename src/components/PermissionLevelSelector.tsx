import { Badge } from "@/components/ui/badge";
import type { ModulePermissionMap, PermissionLevel, UiModule } from "@/lib/permissions";
import { permissionLevelBadgeClass } from "@/lib/domain-colors";
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
    <div className="grid gap-4">
      {UI_MODULES.map((module) => (
        <section className="rounded-xl border bg-card p-4" key={module}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium">{UI_MODULE_LABELS[module]}</h3>
              <p className="text-xs text-muted-foreground">
                {PERMISSION_LEVEL_DESCRIPTIONS[value[module]]}
              </p>
            </div>
            <Badge
              className={permissionLevelBadgeClass[value[module]]}
              variant="outline"
            >
              {PERMISSION_LEVEL_LABELS[value[module]]}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PERMISSION_LEVELS.map((level) => {
              const isSelected = value[module] === level;
              return (
                <button
                  className={cn(
                    "min-h-11 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted",
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
