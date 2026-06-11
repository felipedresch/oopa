import { AlertTriangleIcon } from "lucide-react";

type BairroWarningBannerProps = {
  message: string;
};

export function BairroWarningBanner({ message }: BairroWarningBannerProps) {
  return (
    <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
      <AlertTriangleIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
