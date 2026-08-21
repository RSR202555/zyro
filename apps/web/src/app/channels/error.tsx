"use client";

import { useEffect } from "react";

export default function ChannelsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro no módulo de Canais capturado:", error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 p-6 text-center text-zinc-100 select-none h-full w-full">
      <div className="w-full max-w-sm rounded-xl bg-zinc-900 border border-zinc-800 p-6 shadow-xl flex flex-col items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-950/60 border border-indigo-800 text-indigo-400 text-xl font-bold">
          💬
        </div>
        <h3 className="text-base font-bold text-zinc-100">Não foi possível carregar este canal</h3>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Ocorreu um erro temporário ao carregar o conteúdo do canal ou comunidade.
        </p>
        <div className="flex items-center gap-2 w-full mt-2">
          <button
            onClick={() => (window.location.href = "/onboarding")}
            className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-xs font-semibold text-zinc-300 transition-colors"
          >
            Comunidades
          </button>
          <button
            onClick={() => reset()}
            className="flex-1 px-3 py-2 rounded-lg bg-indigo-650 hover:bg-indigo-600 text-xs font-semibold text-white transition-colors"
          >
            Recarregar
          </button>
        </div>
      </div>
    </div>
  );
}
