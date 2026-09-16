"use client";

import { Check, ChevronDown } from "lucide-react";
import * as React from "react";
import { cn } from "../../lib/utils";

interface OptionInfo {
  value: string;
  label: React.ReactNode;
  disabled?: boolean | undefined;
}

function extractOptions(children: React.ReactNode): OptionInfo[] {
  const options: OptionInfo[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement<React.ComponentProps<"option">>(child)) return;
    options.push({
      value: String(child.props.value ?? ""),
      label: child.props.children,
      disabled: child.props.disabled,
    });
  });
  return options;
}

export interface SelectProps {
  id?: string;
  value: string | number;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

// A custom listbox, not a native <select> — a native select's dropdown
// popup can't be themed (border-radius, shadow, selected-row color) across
// browsers, which is what made it look "out of theme" against our dark UI
// even though the trigger itself was styled. This trades away the native
// control's free keyboard/screen-reader behavior for full visual control,
// so a minimal keyboard pattern (arrows/Home/End/Enter/Escape) is
// reimplemented below rather than left out entirely.
export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  ({ id, value, onChange, children, className, disabled, ...rest }, ref) => {
    const [open, setOpen] = React.useState(false);
    const [highlighted, setHighlighted] = React.useState(0);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const listRef = React.useRef<HTMLUListElement>(null);
    const options = React.useMemo(() => extractOptions(children), [children]);
    const selectedIndex = options.findIndex((o) => o.value === String(value));
    const selected = selectedIndex === -1 ? undefined : options[selectedIndex];

    React.useEffect(() => {
      if (open) setHighlighted(selectedIndex === -1 ? 0 : selectedIndex);
    }, [open, selectedIndex]);

    React.useEffect(() => {
      if (open) listRef.current?.focus();
    }, [open]);

    React.useEffect(() => {
      if (!open) return;
      function handlePointerDown(e: PointerEvent) {
        if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
      }
      document.addEventListener("pointerdown", handlePointerDown);
      return () =>
        document.removeEventListener("pointerdown", handlePointerDown);
    }, [open]);

    function commit(index: number) {
      const option = options[index];
      if (!option || option.disabled) return;
      onChange(option.value);
      setOpen(false);
    }

    function handleTriggerKeyDown(e: React.KeyboardEvent) {
      if (
        e.key === "ArrowDown" ||
        e.key === "ArrowUp" ||
        e.key === "Enter" ||
        e.key === " "
      ) {
        e.preventDefault();
        setOpen(true);
      }
    }

    function handleListKeyDown(e: React.KeyboardEvent) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlighted((i) => Math.min(i + 1, options.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlighted((i) => Math.max(i - 1, 0));
          break;
        case "Home":
          e.preventDefault();
          setHighlighted(0);
          break;
        case "End":
          e.preventDefault();
          setHighlighted(options.length - 1);
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          commit(highlighted);
          break;
        case "Escape":
        case "Tab":
          setOpen(false);
          break;
      }
    }

    return (
      <div ref={containerRef} className="relative">
        <button
          ref={ref}
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={handleTriggerKeyDown}
          className={cn(
            "flex h-11 w-full items-center justify-between gap-2 rounded-md border border-border-strong bg-surface px-3.5 text-left text-sm text-foreground shadow-sm transition-[border-color,box-shadow] duration-150 outline-none",
            "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...rest}
        >
          <span className="truncate">{selected?.label}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-text-secondary transition-transform",
              open && "rotate-180",
            )}
            strokeWidth={1.75}
            aria-hidden="true"
          />
        </button>
        {open && (
          <ul
            ref={listRef}
            role="listbox"
            tabIndex={-1}
            onKeyDown={handleListKeyDown}
            className="absolute z-50 mt-1.5 max-h-60 w-full overflow-auto rounded-md border border-border bg-card p-1 shadow-lg outline-none"
          >
            {options.map((option, index) => (
              <li
                key={option.value}
                role="option"
                aria-selected={index === selectedIndex}
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => commit(index)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 rounded-sm px-2.5 py-2 text-sm transition-colors",
                  index === highlighted
                    ? "bg-primary/15 text-primary"
                    : "text-foreground",
                  option.disabled && "pointer-events-none opacity-50",
                )}
              >
                {option.label}
                {index === selectedIndex && (
                  <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  },
);
Select.displayName = "Select";
