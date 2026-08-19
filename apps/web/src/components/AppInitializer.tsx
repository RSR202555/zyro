"use client";

import React, { useEffect } from "react";
import { useAppStore } from "@zyro/shared";

export const AppInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initializeAuth = useAppStore((state) => state.initializeAuth);
  const isLoading = useAppStore((state) => state.isLoading);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="flex flex-col items-center gap-4">
          {/* Subtle loading spinner */}
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-sm font-medium tracking-wide text-zinc-400">Carregando Zyro...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
