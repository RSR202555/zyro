"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@zyro/shared";

export default function RootPage() {
  const router = useRouter();
  const session = useAppStore((state) => state.session);
  const communities = useAppStore((state) => state.communities);
  const currentCommunity = useAppStore((state) => state.currentCommunity);
  const currentChannel = useAppStore((state) => state.currentChannel);
  const isLoading = useAppStore((state) => state.isLoading);

  useEffect(() => {
    if (isLoading) return;

    if (!session) {
      router.replace("/login");
    } else {
      if (communities.length === 0) {
        router.replace("/onboarding");
      } else {
        const activeComm = currentCommunity || communities[0];
        if (activeComm) {
          // Se houver canal selecionado usa ele, senão redireciona para a raiz dos canais
          const chanId = currentChannel?.id;
          if (chanId) {
            router.replace(`/channels/${activeComm.id}/${chanId}`);
          } else {
            router.replace(`/channels/${activeComm.id}/default`);
          }
        } else {
          router.replace("/onboarding");
        }
      }
    }
  }, [session, communities, currentCommunity, currentChannel, isLoading, router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-100">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <p className="text-sm font-medium tracking-wide text-zinc-400">Verificando sessão...</p>
      </div>
    </div>
  );
}
