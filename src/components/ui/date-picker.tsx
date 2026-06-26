import * as React from "react";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const ISO_FORMAT = "yyyy-MM-dd";

/** Parse a `yyyy-MM-dd` string into a local Date, or undefined when empty/invalid. */
function parseIso(value: string): Date | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = parse(value, ISO_FORMAT, new Date());
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/** Splits a value into its date (`yyyy-MM-dd`) and time (`HH:mm`) parts. */
function splitValue(value: string): { date: string; time: string } {
  const [date = "", time = ""] = value.split("T");
  return { date, time };
}

type DatePickerProps = {
  id?: string;
  /**
   * Date string. `yyyy-MM-dd` by default, or `yyyy-MM-ddTHH:mm` when `withTime`
   * is set — the same contracts as `<input type="date">` / `datetime-local`.
   */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Latest selectable date (defaults to no limit). */
  toDate?: Date;
  fromDate?: Date;
  /** Adds a time field and switches to the `yyyy-MM-ddTHH:mm` contract. */
  withTime?: boolean;
  className?: string;
};

/**
 * Date (and optional time) picker built on shadcn Popover + Calendar (pt-BR),
 * keeping the same string contract as native `<input type="date">` /
 * `datetime-local` so it is a drop-in replacement. Displays dd/mm/aaaa.
 */
export function DatePicker({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  toDate,
  fromDate,
  withTime = false,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const { date: datePart, time: timePart } = splitValue(value);
  const selected = parseIso(datePart);
  const time = timePart || "12:00";

  const emit = (nextDate: string, nextTime: string) => {
    if (!nextDate) {
      onChange("");
      return;
    }
    onChange(withTime ? `${nextDate}T${nextTime}` : nextDate);
  };

  const triggerLabel = selected
    ? `${format(selected, "dd/MM/yyyy", { locale: ptBR })}${withTime ? ` ${time}` : ""}`
    : (placeholder ?? (withTime ? "dd/mm/aaaa --:--" : "dd/mm/aaaa"));

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          className={cn(
            "h-11 w-full justify-start gap-2 px-3 font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
          disabled={disabled}
          id={id}
          type="button"
          variant="outline"
        >
          <CalendarIcon aria-hidden="true" className="size-4 shrink-0" />
          {triggerLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          captionLayout="dropdown"
          defaultMonth={selected}
          disabled={[
            ...(toDate ? [{ after: toDate }] : []),
            ...(fromDate ? [{ before: fromDate }] : []),
          ]}
          locale={ptBR}
          mode="single"
          onSelect={(date) => {
            const nextDate = date ? format(date, ISO_FORMAT) : "";
            emit(nextDate, time);
            if (!withTime) {
              setOpen(false);
            }
          }}
          selected={selected}
        />
        {withTime ? (
          <div className="flex items-center gap-2 border-t p-2.5">
            <label className="text-sm text-muted-foreground" htmlFor={id ? `${id}-time` : undefined}>
              Hora
            </label>
            <Input
              className="h-9"
              id={id ? `${id}-time` : undefined}
              onChange={(event) => emit(datePart, event.target.value)}
              type="time"
              value={time}
            />
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
