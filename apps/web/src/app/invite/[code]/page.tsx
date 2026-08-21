"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppStore, supabase } from "@zyro/shared";
import { Button } from "@zyro/ui";
import { ShieldCheck, Compass, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const rawCode = (params?.code as string) || "";
  const cleanCode = rawCode.trim();

  const session = useAppStore((state) => state.session);
  const profile = useAppStore((state) => state.profile);
  const loadCommunities = useAppStore((state) => state.loadCommunities);

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [community, setCommunity] = useState<{ id: string; name: string; description?: string } | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cleanCode) {
      setError("Código de convite não fornecido.");
      setLoading(false);
      return;
    }

    const fetchInviteDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Buscar detalhes do convite e da comunidade associada
        const { data: invite, error: inviteErr } = await supabase
          .from("invitations")
          .select("*, communities(*)")
          .ilike("code", cleanCode)
          .maybeSingle();

        if (inviteErr || !invite || !invite.communities) {
          throw new Error("Convite inválido ou expirado.");
        }

        if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
          throw new Error("Este convite já expirou.");
        }

        if (invite.max_uses && invite.max_uses > 0 && invite.uses >= invite.max_uses) {
          throw new Error("Este convite atingiu o limite máximo de usos.");
        }

        const comm = invite.communities;
        setCommunity({ id: comm.id, name: comm.name, description: comm.description });

        // 2. Se logado, verificar se o usuário já é membro
        if (profile?.id) {
          const { data: member } = await supabase
            .from("community_members")
            .select("id")
            .eq("community_id", comm.id)
            .eq("user_id", profile.id)
            .maybeSingle();

          if (member) {
            setIsMember(true);
          }
        }
      } catch (err: any) {
        console.error("Erro ao buscar convite:", err);
        setError(err.message || "Erro ao carregar convite.");
      } finally {
        setLoading(false);
      }
    };

    fetchInviteDetails();
  }, [cleanCode, profile?.id]);

  const handleAcceptInvite = async () => {
    if (!cleanCode) return;

    if (!session || !profile) {
      // Salvar código pendente e redirecionar para login
      if (typeof window !== "undefined") {
        localStorage.setItem("zyro_pending_invite", cleanCode);
      }
      router.push("/login");
      return;
    }

    setJoining(true);
    setError(null);

    try {
      let communityId: string | null = community?.id || null;

      // 1. Tentar via RPC seguro
      const { data: rpcCommId, error: rpcErr } = await supabase.rpc(
        "join_community_by_invite",
        { p_code: cleanCode }
      );

      if (!rpcErr && rpcCommId) {
        communityId = rpcCommId;
      } else if (community) {
        // Fallback manual
        const { error: memberError } = await supabase
          .from("community_members")
          .insert({
            community_id: community.id,
            user_id: profile.id,
          });

        if (memberError && memberError.code !== "23505") {
          throw memberError;
        }

        try {
          await supabase
            .from("invitations")
            .update({ uses: (supabase as any).sql`uses + 1` })
            .ilike("code", cleanCode);
        } catch (e) {
          console.warn("Aviso ao atualizar usos:", e);
        }
      }

      await loadCommunities();

      if (typeof window !== "undefined") {
        localStorage.removeItem("zyro_pending_invite");
      }

      if (communityId) {
        router.push(`/channels/${communityId}/default`);
      } else {
        router.push("/");
      }
    } catch (err: any) {
      console.error("Erro ao aceitar convite:", err);
      setError(err.message || "Erro ao entrar na comunidade.");
      setJoining(false);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 p-4 select-none">
      <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-8 shadow-2xl flex flex-col items-center gap-6 text-center">
        
        {/* Ícone de Marca / Comunidade */}
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-650/20 border border-indigo-500/30 text-indigo-400 font-extrabold text-2xl shadow-lg">
          {community ? community.name.substring(0, 2).toUpperCase() : "Z"}
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <p className="text-xs text-zinc-400 font-medium">Verificando código de convite...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-4 w-full">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-950/60 border border-red-800 text-red-400">
              <AlertCircle size={20} />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold text-zinc-100">Convite Indisponível</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">{error}</p>
            </div>
            <Button onClick={() => router.push("/")} variant="ghost" className="w-full mt-2">
              Ir para o Início
            </Button>
          </div>
        ) : community ? (
          <div className="flex flex-col items-center gap-5 w-full">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center justify-center gap-1">
                <ShieldCheck size={12} /> Convite Privado Zyro
              </span>
              <h2 className="text-2xl font-extrabold text-zinc-100">{community.name}</h2>
              {community.description && (
                <p className="text-xs text-zinc-400 mt-1 max-w-xs">{community.description}</p>
              )}
            </div>

            {isMember ? (
              <div className="flex flex-col items-center gap-3 w-full">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-800/60 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 size={14} /> Você já é membro desta comunidade
                </div>
                <Button
                  onClick={() => router.push(`/channels/${community.id}/default`)}
                  variant="primary"
                  className="w-full flex items-center justify-center gap-2"
                >
                  <span>Entrar no Espaço</span>
                  <ArrowRight size={16} />
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 w-full">
                <Button
                  onClick={handleAcceptInvite}
                  variant="primary"
                  className="w-full flex items-center justify-center gap-2"
                  disabled={joining}
                >
                  {joining ? (
                    <span>Entrando na Comunidade...</span>
                  ) : (
                    <>
                      <span>{session ? "Aceitar Convite" : "Entrar para Aceitar"}</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </Button>
                {!session && (
                  <p className="text-[11px] text-zinc-500">
                    Você precisará se conectar à sua conta do Zyro para se juntar.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : null}

      </div>
    </div>
  );
}
