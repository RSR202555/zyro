import * as React from "react";
import { cn } from "../utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800": variant === "primary",
            "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 active:bg-zinc-650": variant === "secondary",
            "bg-red-600 text-white hover:bg-red-700 active:bg-red-800": variant === "danger",
            "bg-transparent text-zinc-450 hover:bg-zinc-800 hover:text-zinc-100": variant === "ghost",
            "border border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-800": variant === "outline",
          },
          {
            "h-8 px-3 text-xs": size === "sm",
            "h-10 px-4 text-sm": size === "md",
            "h-12 px-6 text-base": size === "lg",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
