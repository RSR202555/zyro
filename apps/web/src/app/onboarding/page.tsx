"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore, supabase } from "@zyro/shared";
import { Button, Input, Dialog } from "@zyro/ui";

export default function OnboardingPage() {
  const router = useRouter();
  const session = useAppStore((state) => state.session);
  const profile = useAppStore((state) => state.profile);
  const loadCommunities = useAppStore((state) => state.loadCommunities);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [commName, setCommName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      router.replace("/login");
    }
  }, [session, router]);

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !commName.trim()) return;
    setError(null);
    setLoading(true);

    try {
      // 1. Criar comunidade
      const { data: community, error: commError } = await supabase
        .from("communities")
        .insert({
          name: commName.trim(),
          owner_id: profile.id,
        })
        .select()
        .single();

      if (commError) throw commError;

      // 2. Criar canais padrão
      if (community) {
        const { error: chanError } = await supabase
          .from("channels")
          .insert([
            {
              community_id: community.id,
              name: "geral",
              type: "text",
              position: 0,
            },
            {
              community_id: community.id,
              name: "Geral (Voz)",
              type: "voice",
              position: 1,
            }
          ]);
        if (chanError) throw chanError;
      }

      await loadCommunities();
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Erro ao criar comunidade.");
      setLoading(false);
    }
  };

  const handleJoinCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !inviteCode.trim()) return;
    setError(null);
    setLoading(true);

    try {
      // 1. Buscar convite
      const { data: invite, error: inviteError } = await supabase
        .from("invitations")
        .select("*")
        .eq("code", inviteCode.trim())
        .single();

      if (inviteError || !invite) {
        throw new Error("Convite inválido ou expirado.");
      }

      // 2. Inserir membro
      const { error: memberError } = await supabase
        .from("community_members")
        .insert({
          community_id: invite.community_id,
          user_id: profile.id,
        });

      if (memberError) {
        if (memberError.code === "23505") {
          throw new Error("Você já faz parte desta comunidade.");
        }
        throw memberError;
      }

      // 3. Atualizar usos do convite
      await supabase
        .from("invitations")
        .update({ uses: invite.uses + 1 })
        .eq("id", invite.id);

      await loadCommunities();
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Erro ao entrar na comunidade.");
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-lg rounded-xl bg-zinc-900 border border-zinc-800 p-8 shadow-2xl flex flex-col gap-6 text-center">
        <h1 className="text-3xl font-extrabold text-zinc-100">Bem-vindo ao Zyro 👋</h1>
        <p className="text-sm text-zinc-400">
          Você ainda não faz parte de nenhuma comunidade privada. Escolha uma das opções abaixo para começar.
        </p>

        {error && (
          <div className="rounded-lg bg-red-950/50 border border-red-800 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div 
            onClick={() => { setError(null); setShowCreateModal(true); }}
            className="flex flex-col gap-3 p-6 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-indigo-500 hover:bg-zinc-900/50 cursor-pointer transition-all text-left"
          >
            <span className="text-3xl">✨</span>
            <h3 className="text-lg font-bold text-zinc-200">Criar Comunidade</h3>
            <p className="text-xs text-zinc-400">
              Crie seu próprio espaço privado e convide seus amigos.
            </p>
          </div>

          <div 
            onClick={() => { setError(null); setShowJoinModal(true); }}
            className="flex flex-col gap-3 p-6 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-indigo-500 hover:bg-zinc-900/50 cursor-pointer transition-all text-left"
          >
            <span className="text-3xl">🔑</span>
            <h3 className="text-lg font-bold text-zinc-200">Entrar com Convite</h3>
            <p className="text-xs text-zinc-400">
              Insira um código de convite enviado por um amigo.
            </p>
          </div>
        </div>

        {/* Modal de Criação */}
        <Dialog 
          isOpen={showCreateModal} 
          onClose={() => setShowCreateModal(false)} 
          title="Criar uma Comunidade"
        >
          <form onSubmit={handleCreateCommunity} className="flex flex-col gap-4">
            <p className="text-xs text-zinc-400">
              Dê um nome para a sua comunidade. Você poderá alterar o ícone e a descrição mais tarde.
            </p>
            <Input
              label="Nome da Comunidade"
              placeholder="ex: Os Amigos do Zyro"
              value={commName}
              onChange={(e) => setCommName(e.target.value)}
              required
              disabled={loading}
            />
            <div className="flex justify-end gap-3 border-t border-zinc-800 pt-4 mt-2">
              <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? "Criando..." : "Criar"}
              </Button>
            </div>
          </form>
        </Dialog>

        {/* Modal de Entrada */}
        <Dialog 
          isOpen={showJoinModal} 
          onClose={() => setShowJoinModal(false)} 
          title="Entrar com Código de Convite"
        >
          <form onSubmit={handleJoinCommunity} className="flex flex-col gap-4">
            <p className="text-xs text-zinc-400">
              Insira o código de convite recebido para entrar na comunidade.
            </p>
            <Input
              label="Código de Convite"
              placeholder="ex: INV-9812A"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              required
              disabled={loading}
            />
            <div className="flex justify-end gap-3 border-t border-zinc-800 pt-4 mt-2">
              <Button type="button" variant="ghost" onClick={() => setShowJoinModal(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </div>
          </form>
        </Dialog>
      </div>
    </div>
  );
}
