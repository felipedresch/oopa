import { PermissionGate } from "@/components/PermissionGate";
import { PlaceholderPage } from "@/app/pages/PlaceholderPage";

type AdminPlaceholderPageProps = {
  title: string;
  description?: string;
  permission?: string;
  anyOf?: readonly string[];
};

export function AdminPlaceholderPage({
  title,
  description,
  permission,
  anyOf,
}: AdminPlaceholderPageProps) {
  return (
    <PermissionGate anyOf={anyOf} permission={permission}>
      <PlaceholderPage description={description} title={title} />
    </PermissionGate>
  );
}
