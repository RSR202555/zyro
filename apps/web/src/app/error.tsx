"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro global capturado pelo Next.js Error Boundary:", error);
  }, [error]);

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-zinc-950 p-6 text-center text-zinc-100 select-none">
      <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-8 shadow-2xl flex flex-col items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-950/60 border border-red-800 text-red-400 text-2xl font-bold">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-zinc-100">Algo deu errado</h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Ocorreu uma falha inesperada na interface. Tente recarregar esta seção ou retornar ao início.
        </p>
        {error?.message && (
          <div className="w-full text-left bg-zinc-950 border border-zinc-800 p-3 rounded-lg text-[11px] font-mono text-zinc-400 overflow-x-auto max-h-24">
            {error.message}
          </div>
        )}
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
            Tentar Novamente
          </button>
        </div>
      </div>
    </div>
  );
}
