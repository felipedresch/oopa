import { AlertTriangleIcon } from "lucide-react";

type BairroWarningBannerProps = {
  message: string;
};

export function BairroWarningBanner({ message }: BairroWarningBannerProps) {
  return (
    <div className="flex gap-3 rounded-xl bg-warning/12 p-4 text-sm leading-6 text-warning">
      <AlertTriangleIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <p className="font-medium">{message}</p>
    </div>
  );
}
