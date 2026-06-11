import { Badge } from "@/components/ui/badge";
import type { ModulePermissionMap } from "@/lib/permissions";
import { permissionLevelBadgeClass } from "@/lib/domain-colors";
import {
  PERMISSION_LEVEL_LABELS,
  UI_MODULES,
  UI_MODULE_LABELS,
} from "@/lib/permissions";

type PermissionSummaryProps = {
  moduleMap: ModulePermissionMap;
};

export function PermissionSummary({ moduleMap }: PermissionSummaryProps) {
  return (
    <div className="divide-y divide-border">
      {UI_MODULES.map((module) => (
        <div className="flex items-center justify-between gap-3 py-2.5" key={module}>
          <span className="text-sm font-medium">{UI_MODULE_LABELS[module]}</span>
          <Badge
            className={permissionLevelBadgeClass[moduleMap[module]]}
            variant="secondary"
          >
            {PERMISSION_LEVEL_LABELS[moduleMap[module]]}
          </Badge>
        </div>
      ))}
    </div>
  );
}
