"use client";

import React, { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro fatal global capturado:", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="bg-zinc-950 text-zinc-100 flex h-screen w-screen flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-8 shadow-2xl flex flex-col items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-950/60 border border-indigo-800 text-indigo-400 text-2xl font-bold">
            🚀
          </div>
          <h2 className="text-xl font-bold text-zinc-100">Zyro Space</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Ocorreu uma atualização na interface ou falha de conexão temporária.
          </p>
          <div className="flex items-center gap-3 w-full mt-2">
            <button
              onClick={() => (window.location.href = "/")}
              className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-xs font-semibold text-zinc-300 transition-colors"
            >
              Início
            </button>
            <button
              onClick={() => reset()}
              className="flex-1 px-4 py-2 rounded-lg bg-indigo-650 hover:bg-indigo-600 text-xs font-semibold text-white transition-colors"
            >
              Recarregar Aplicação
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
