import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { ACTION_COPY } from "@/lib/copy";
import { cn } from "@/lib/utils";

type StepperFormProps = {
  steps: string[];
  currentStep: number;
  children: ReactNode;
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  canContinue?: boolean;
};

export function StepperForm({
  steps,
  currentStep,
  children,
  onBack,
  onContinue,
  continueLabel = ACTION_COPY.continue,
  canContinue = true,
}: StepperFormProps) {
  return (
    <div className="flex flex-col gap-6">
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isComplete = index < currentStep;

          return (
            <li
              className={cn(
                "rounded-lg border px-3 py-2 text-sm",
                isActive && "border-primary bg-primary/5",
                isComplete && "border-emerald-300 bg-emerald-50 dark:bg-emerald-950",
              )}
              key={step}
            >
              <span className="font-medium">
                {index + 1}. {step}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="rounded-xl border bg-card p-4 sm:p-6">{children}</div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        {onBack ? (
          <Button className="min-h-11" onClick={onBack} type="button" variant="outline">
            {ACTION_COPY.back}
          </Button>
        ) : (
          <span />
        )}
        {onContinue ? (
          <Button
            className="min-h-11"
            disabled={!canContinue}
            onClick={onContinue}
            type="button"
          >
            {continueLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
