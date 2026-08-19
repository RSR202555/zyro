import * as React from "react";
import { cn } from "../utils";

export interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
  status?: "online" | "idle" | "do_not_disturb" | "offline";
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ src, name, size = "md", status, className }) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };

  const statusColors = {
    online: "bg-green-500",
    idle: "bg-amber-500",
    do_not_disturb: "bg-red-500",
    offline: "bg-zinc-500",
  };

  return (
    <div className={cn("relative inline-block select-none", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-zinc-800 text-zinc-200 font-bold overflow-hidden border border-zinc-700",
          sizeClasses[size]
        )}
      >
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 block rounded-full ring-2 ring-zinc-950",
            statusColors[status],
            {
              "w-2.5 h-2.5": size === "sm",
              "w-3 h-3": size === "md",
              "w-3.5 h-3.5": size === "lg",
            }
          )}
        />
      )}
    </div>
  );
};
