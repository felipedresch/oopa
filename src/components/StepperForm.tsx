import { CheckIcon } from "lucide-react";
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
    <div className="flex flex-col gap-8">
      <ol className="flex items-start gap-1 sm:gap-2">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isComplete = index < currentStep;

          return (
            <li
              aria-current={isActive ? "step" : undefined}
              className="flex flex-1 flex-col items-center gap-1.5 text-center"
              key={step}
            >
              <div className="flex w-full items-center">
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-px flex-1",
                    index === 0
                      ? "bg-transparent"
                      : isComplete || isActive
                        ? "bg-primary/50"
                        : "bg-border",
                  )}
                />
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                    isComplete && "bg-primary text-primary-foreground",
                    isActive && "bg-accent text-accent-foreground ring-2 ring-primary",
                    !isComplete && !isActive && "bg-muted text-muted-foreground",
                  )}
                >
                  {isComplete ? (
                    <CheckIcon aria-hidden="true" className="size-4" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-px flex-1",
                    index === steps.length - 1
                      ? "bg-transparent"
                      : isComplete
                        ? "bg-primary/50"
                        : "bg-border",
                  )}
                />
              </div>
              <span
                className={cn(
                  "hidden px-1 text-xs leading-tight sm:block",
                  isActive ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {step}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="-mt-4 text-center text-sm font-medium sm:hidden">
        {steps[currentStep]}
      </p>

      <div>{children}</div>

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
