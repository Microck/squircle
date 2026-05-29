"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type SwitchProps = Omit<React.ComponentProps<"button">, "onChange"> & {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  readOnly?: boolean;
};

export function Switch({
  checked,
  className,
  defaultChecked = false,
  disabled,
  onCheckedChange,
  onClick,
  readOnly,
  ...props
}: SwitchProps): React.ReactElement {
  const [uncontrolledChecked, setUncontrolledChecked] = React.useState(defaultChecked);
  const isControlled = checked !== undefined;
  const currentChecked = isControlled ? checked : uncontrolledChecked;

  const updateChecked = React.useCallback((nextChecked: boolean) => {
    if (!isControlled) {
      setUncontrolledChecked(nextChecked);
    }
    onCheckedChange?.(nextChecked);
  }, [isControlled, onCheckedChange]);

  return (
    <button
      aria-checked={currentChecked}
      className={cn(
        "inline-flex h-[calc(var(--thumb-size)+2px)] w-[calc(var(--thumb-size)*2-2px)] shrink-0 items-center rounded-full p-px outline-none transition-[background-color,box-shadow] duration-200 [--thumb-size:--spacing(5)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background data-disabled:cursor-not-allowed data-checked:bg-primary data-unchecked:bg-input data-disabled:opacity-64 sm:[--thumb-size:--spacing(4)]",
        className,
      )}
      data-checked={currentChecked ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      data-slot="switch"
      data-unchecked={currentChecked ? undefined : ""}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && !readOnly) {
          updateChecked(!currentChecked);
        }
      }}
      role="switch"
      type="button"
      {...props}
    >
      <span
        className={cn(
          "pointer-events-none block aspect-square h-full origin-left in-[[role=switch]:active,[data-slot=label]:active,[data-slot=field-label]:active]:not-data-disabled:scale-x-110 in-[[role=switch]:active,[data-slot=label]:active,[data-slot=field-label]:active]:rounded-[var(--thumb-size)/calc(var(--thumb-size)*1.1)] rounded-(--thumb-size) bg-background shadow-sm/5 will-change-transform [transition:translate_.15s,border-radius_.15s,scale_.1s_.1s,transform-origin_.15s] data-checked:origin-[var(--thumb-size)_50%] data-checked:translate-x-[calc(var(--thumb-size)-4px)]",
        )}
        data-checked={currentChecked ? "" : undefined}
        data-slot="switch-thumb"
      />
    </button>
  );
}
