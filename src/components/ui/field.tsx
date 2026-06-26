import * as React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldProps = Omit<React.ComponentProps<typeof Input>, "onChange" | "value"> & {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Optional mask applied to the raw input before propagating. */
  mask?: (value: string) => string;
  /** Returns an error message for the value, or null when valid. */
  validate?: (value: string) => string | null;
  hint?: string;
};

/**
 * Label + Input + per-field error message. Validation runs on blur and on
 * every change once the field has been touched, mirroring `validate`.
 */
export function Field({
  id,
  label,
  value,
  onChange,
  mask,
  validate,
  hint,
  required,
  className,
  ...inputProps
}: FieldProps) {
  const [touched, setTouched] = React.useState(false);

  const error = touched && validate ? validate(value) : null;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <Input
        aria-describedby={cn(error ? errorId : null, hint ? hintId : null) || undefined}
        aria-invalid={error ? true : undefined}
        className={className}
        id={id}
        onBlur={() => setTouched(true)}
        onChange={(event) => onChange(mask ? mask(event.target.value) : event.target.value)}
        required={required}
        value={value}
        {...inputProps}
      />
      {hint ? (
        <p className="text-xs text-muted-foreground" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
