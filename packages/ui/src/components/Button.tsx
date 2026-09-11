import type { ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-gray-900 text-white",
  secondary: "border text-gray-900",
  danger: "bg-red-600 text-white",
};

export function Button({
  variant = "secondary",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      {...props}
      className={`rounded px-4 py-2 text-sm font-medium disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
    />
  );
}
