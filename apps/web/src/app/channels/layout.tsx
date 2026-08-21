"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAppStore, supabase } from "@zyro/shared";
import { Avatar, Button, Dialog, Input } from "@zyro/ui";
import { 
  Plus, 
  Settings, 
  Mic, 
  MicOff, 
  Headphones, 
  LogOut, 
  MessageSquare, 
  Volume2, 
  Compass, 
  UserPlus, 
  ChevronDown, 
  PlusCircle, 
  Globe,
  Lock,
  Layers,
  ChevronRight,
  Trash
} from "lucide-react";

export default function ChannelsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useParams();
  const session = useAppStore((state) => state.session);
  const profile = useAppStore((state) => state.profile);
  const communities = useAppStore((state) => state.communities);
  const channels = useAppStore((state) => state.channels);
  const currentCommunity = useAppStore((state) => state.currentCommunity);
  const currentChannel = useAppStore((state) => state.currentChannel);
  
  const loadCommunities = useAppStore((state) => state.loadCommunities);
  const setCurrentCommunity = useAppStore((state) => state.setCurrentCommunity);
  const setCurrentChannel = useAppStore((state) => state.setCurrentChannel);
  const updateProfileStatus = useAppStore((state) => state.updateProfileStatus);
  const updateProfile = useAppStore((state) => state.updateProfile);
  const signOut = useAppStore((state) => state.signOut);
  const createChannel = useAppStore((state) => state.createChannel);
  const deleteChannel = useAppStore((state) => state.deleteChannel);

  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  
  // Modais e Dropdowns
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [showCommunityDropdown, setShowCommunityDropdown] = useState(false);
  
  const [commName, setCommName] = useState("");
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<'text' | 'voice'>("text");
  const [inviteCode, setInviteCode] = useState("");
  const [joinInviteCode, setJoinInviteCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Customização de Perfil e Configurações (Fase 5)
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newBio, setNewBio] = useState("");
  const [newAvatarUrl, setNewAvatarUrl] = useState("");
  const [newCustomStatus, setNewCustomStatus] = useState("");
  const [newProfileColor, setNewProfileColor] = useState("indigo");
  const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'media' | 'appearance'>("profile");
  
  // Estados de Hardware
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [speakers, setSpeakers] = useState<MediaDeviceInfo[]>([]);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState("");
  const [selectedSpeaker, setSelectedSpeaker] = useState("");
  const [selectedCam, setSelectedCam] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("indigo");
  
  // Medidor de Microfone (Configurações Premium)
  const [micLevel, setMicLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const [loading, setLoading] = useState(false);

  // Redirecionar se não logado
  useEffect(() => {
    if (!session) {
      router.replace("/login");
    } else {
      loadCommunities();
    }
  }, [session, router, loadCommunities]);

  // Sincronizar URL params com o Store
  useEffect(() => {
    const communityId = params.communityId as string;
    if (communityId && communities && communities.length > 0) {
      const comm = communities.find((c) => c.id === communityId);
      if (comm) {
        if (comm.id !== currentCommunity?.id) {
          setCurrentCommunity(comm);
        }
      } else if (communities[0]) {
        setCurrentCommunity(communities[0]);
        router.replace(`/channels/${communities[0].id}/default`);
      }
    }
  }, [params.communityId, communities, currentCommunity, setCurrentCommunity, router]);

  useEffect(() => {
    const channelId = params.channelId as string;
    if (channelId && channels.length > 0) {
      const chan = channels.find((c) => c.id === channelId);
      if (chan && chan.id !== currentChannel?.id) {
        setCurrentChannel(chan);
      }
    }
  }, [params.channelId, channels, currentChannel, setCurrentChannel]);

  // Sincronizar configurações de hardware e perfil
  useEffect(() => {
    if (showProfileModal && typeof window !== "undefined") {
      if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        navigator.mediaDevices.enumerateDevices().then((devices) => {
          setMics(devices.filter((d) => d.kind === "audioinput"));
          setSpeakers(devices.filter((d) => d.kind === "audiooutput"));
          setCameras(devices.filter((d) => d.kind === "videoinput"));
        }).catch((err) => {
          console.warn("Erro ao enumerar dispositivos:", err);
        });
      } else {
        console.warn("API de dispositivos de mídia não suportada neste ambiente.");
      }

      setSelectedMic(localStorage.getItem("zyro_preferred_mic") || "");
      setSelectedSpeaker(localStorage.getItem("zyro_preferred_speaker") || "");
      setSelectedCam(localStorage.getItem("zyro_preferred_cam") || "");
      setSelectedTheme(localStorage.getItem("zyro_theme") || "indigo");

      if (profile) {
        setNewDisplayName(profile.display_name || "");
        setNewBio(profile.bio || "");
        setNewAvatarUrl(profile.avatar_url || "");
        setNewCustomStatus(profile.custom_status || "");
        setNewProfileColor(profile.profile_color || "indigo");
      }
    }
  }, [showProfileModal, profile]);

  // Medidor de volume de microfone em tempo real (Web Audio API)
  useEffect(() => {
    if (showProfileModal && activeSettingsTab === "media" && typeof window !== "undefined") {
      const micId = selectedMic || undefined;
      
      if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ 
          audio: micId ? { deviceId: micId } : true 
        })
          .then((stream) => {
            streamRef.current = stream;
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioCtx) {
              console.warn("Web Audio API não suportada.");
              return;
            }
            const audioContext = new AudioCtx();
            audioContextRef.current = audioContext;
            
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const updateVolume = () => {
              if (!analyserRef.current) return;
              analyserRef.current.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
              }
              const average = sum / bufferLength;
              // Mapear volume (0-128 avg) para porcentagem (0-100)
              const level = Math.min(100, Math.round((average / 80) * 100));
              setMicLevel(level);
              animationFrameRef.current = requestAnimationFrame(updateVolume);
            };

            updateVolume();
          })
          .catch((err) => {
            console.warn("Erro ou permissão negada para o microfone:", err);
          });
      } else {
        console.warn("navigator.mediaDevices.getUserMedia não disponível.");
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      analyserRef.current = null;
      setMicLevel(0);
    };
  }, [showProfileModal, activeSettingsTab, selectedMic]);

  // Ouvir atalhos globais e detecção de jogos no Electron
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).zyroDesktop) {
      const desktop = (window as any).zyroDesktop;

      desktop.onToggleMute(() => {
        setMuted((m) => !m);
      });

      desktop.onToggleDeafen(() => {
        setDeafened((d) => !d);
      });

      desktop.onGameDetected(async (gameName: string | null) => {
        if (gameName) {
          await updateProfile({ custom_status: `🎮 Jogando ${gameName}` });
        } else {
          const currentStatus = useAppStore.getState().profile?.custom_status;
          if (currentStatus && currentStatus.startsWith("🎮 Jogando ")) {
            await updateProfile({ custom_status: null });
          }
        }
      });
    }
  }, [updateProfile]);

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !commName.trim()) return;
    setLoading(true);

    try {
      const { data: community, error: commError } = await supabase
        .from("communities")
        .insert({ name: commName.trim(), owner_id: profile.id })
        .select()
        .single();

      if (commError) throw commError;

      if (community) {
        await supabase.from("channels").insert([
          { community_id: community.id, name: "geral", type: "text", position: 0 },
          { community_id: community.id, name: "Geral (Voz)", type: "voice", position: 1 }
        ]);
      }

      setCommName("");
      setShowCreateModal(false);
      await loadCommunities();
      if (community) {
        router.push(`/channels/${community.id}/default`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinInviteCode.trim();
    if (!profile || !cleanCode) return;
    setJoinError(null);
    setLoading(true);

    try {
      let communityId: string | null = null;

      const { data: rpcCommunityId, error: rpcError } = await supabase.rpc(
        "join_community_by_invite",
        { p_code: cleanCode }
      );

      if (!rpcError && rpcCommunityId) {
        communityId = rpcCommunityId;
      } else {
        const { data: invite, error: inviteError } = await supabase
          .from("invitations")
          .select("*")
          .ilike("code", cleanCode)
          .maybeSingle();

        if (inviteError || !invite) {
          throw new Error("Convite inválido ou não encontrado.");
        }

        if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
          throw new Error("Este convite já expirou.");
        }

        if (invite.max_uses && invite.max_uses > 0 && invite.uses >= invite.max_uses) {
          throw new Error("Este convite atingiu o limite máximo de usos.");
        }

        const { error: memberError } = await supabase
          .from("community_members")
          .insert({
            community_id: invite.community_id,
            user_id: profile.id,
          });

        if (memberError && memberError.code !== "23505") {
          throw memberError;
        }

        try {
          await supabase
            .from("invitations")
            .update({ uses: invite.uses + 1 })
            .eq("id", invite.id);
        } catch (e) {
          console.warn("Não foi possível atualizar convite:", e);
        }

        communityId = invite.community_id;
      }

      await loadCommunities();
      setShowJoinModal(false);
      setJoinInviteCode("");
      
      if (communityId) {
        router.push(`/channels/${communityId}/default`);
      }
    } catch (err: any) {
      console.error("Erro ao entrar na comunidade:", err);
      setJoinError(err.message || "Erro ao entrar na comunidade.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvite = async () => {
    if (!currentCommunity || !profile) return;
    setLoading(true);

    try {
      // 1. Tentar gerar convite via RPC com SECURITY DEFINER (funciona para donos e membros)
      const { data: rpcCode, error: rpcErr } = await supabase.rpc("create_community_invite", {
        p_community_id: currentCommunity.id,
      });

      if (!rpcErr && rpcCode) {
        setInviteCode(rpcCode);
      } else {
        // Fallback manual de inserção
        const code = `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const { error } = await supabase.from("invitations").insert({
          community_id: currentCommunity.id,
          code,
          created_by: profile.id,
        });

        if (error) throw error;
        setInviteCode(code);
      }
    } catch (err: any) {
      console.error("Erro ao gerar convite:", err);
      alert("Erro ao gerar convite: " + (err.message || "Falha de permissão."));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyInviteLink = (code: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://zyro8837.vercel.app";
    const fullLink = `${baseUrl}/invite/${code}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fullLink).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }).catch(() => {
        fallbackCopyText(fullLink);
      });
    } else {
      fallbackCopyText(fullLink);
    }
  };

  const fallbackCopyText = (text: string) => {
    try {
      const input = document.createElement("textarea");
      input.value = text;
      input.style.position = "fixed";
      input.style.left = "-999999px";
      document.body.appendChild(input);
      input.focus();
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error("Erro ao copiar via fallback:", e);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);

    try {
      // 1. Atualizar campos de perfil no banco de dados via Zustand Action
      await updateProfile({
        display_name: newDisplayName.trim() || null,
        bio: newBio.trim() || null,
        avatar_url: newAvatarUrl.trim() || null,
        custom_status: newCustomStatus.trim() || null,
        profile_color: newProfileColor,
      });

      // 2. Salvar configurações de hardware e tema visual localmente
      if (typeof window !== "undefined") {
        localStorage.setItem("zyro_preferred_mic", selectedMic);
        localStorage.setItem("zyro_preferred_speaker", selectedSpeaker);
        localStorage.setItem("zyro_preferred_cam", selectedCam);
        localStorage.setItem("zyro_theme", selectedTheme);
      }

      setShowProfileModal(false);
    } catch (err) {
      console.error("Erro ao atualizar configurações:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  if (!profile) return null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950">
      
      {/* SIDEBAR ÚNICA DO ZYRO (SLACK / LINEAR HYBRID STYLE) */}
      <div className="flex flex-col w-64 bg-zinc-900 border-r border-zinc-800/60 select-none">
        
        {/* CABEÇALHO COM SELETOR DE COMUNIDADE (DROPDOWN) */}
        <div className="relative">
          <div 
            onClick={() => setShowCommunityDropdown(!showCommunityDropdown)}
            className="flex items-center justify-between h-14 px-4 border-b border-zinc-800 bg-zinc-900 hover:bg-zinc-850 cursor-pointer transition-colors select-none"
            style={{ WebkitAppRegion: "drag" } as any}
          >
            <div className="flex items-center gap-2.5 min-w-0" style={{ WebkitAppRegion: "no-drag" } as any}>
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-650 text-white font-extrabold text-xs">
                {currentCommunity ? currentCommunity.name.substring(0, 2).toUpperCase() : "Z"}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-zinc-100 text-sm truncate">
                  {currentCommunity ? currentCommunity.name : "Selecionar Comunidade"}
                </span>
                <span className="text-[10px] text-zinc-500 font-medium">Zyro Private</span>
              </div>
            </div>
            <ChevronDown 
              size={14} 
              className={`text-zinc-400 transition-transform ${showCommunityDropdown ? "rotate-180" : ""}`} 
              style={{ WebkitAppRegion: "no-drag" } as any}
            />
          </div>

          {/* Menu Dropdown de Comunidades */}
          {showCommunityDropdown && (
            <div className="absolute top-15 left-2 right-2 z-50 rounded-xl border border-zinc-800 bg-zinc-950 p-1.5 shadow-2xl flex flex-col gap-1">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider px-2 py-1">
                Minhas Comunidades
              </span>
              
              <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
                {communities.map((comm) => {
                  const isSelected = currentCommunity?.id === comm.id;
                  return (
                    <div
                      key={comm.id}
                      onClick={() => {
                        setCurrentCommunity(comm);
                        setShowCommunityDropdown(false);
                        router.push(`/channels/${comm.id}/default`);
                      }}
                      className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                        isSelected 
                          ? "bg-indigo-650 text-white font-semibold" 
                          : "text-zinc-300 hover:bg-zinc-900 hover:text-zinc-150"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-5 h-5 rounded bg-zinc-800 text-[10px] flex items-center justify-center font-bold">
                          {comm.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="truncate">{comm.name}</span>
                      </div>
                      {isSelected && <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />}
                    </div>
                  );
                })}
              </div>

              <div className="h-[1px] bg-zinc-800 my-1.5" />

              <div 
                onClick={() => { setShowCommunityDropdown(false); setShowCreateModal(true); }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-emerald-400 hover:bg-emerald-950/20 cursor-pointer transition-colors"
              >
                <PlusCircle size={14} />
                <span>Criar Comunidade</span>
              </div>

              <div 
                onClick={() => { setShowCommunityDropdown(false); setJoinError(null); setJoinInviteCode(""); setShowJoinModal(true); }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-amber-400 hover:bg-amber-950/20 cursor-pointer transition-colors"
              >
                <Compass size={14} />
                <span>Entrar com Convite</span>
              </div>
              
              {currentCommunity && (
                <div 
                  onClick={() => { setShowCommunityDropdown(false); setInviteCode(""); setShowInviteModal(true); }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-indigo-400 hover:bg-indigo-950/20 cursor-pointer transition-colors"
                >
                  <UserPlus size={14} />
                  <span>Convidar Amigos</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* LISTA DE CANAIS (VISÃO UNIFICADA) */}
        {currentCommunity ? (
          <div className="flex-1 overflow-y-auto px-2 py-4 flex flex-col gap-5">
            {/* Seção Canais de Texto */}
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between px-2 mb-1.5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Canais de Texto
                </span>
                {currentCommunity.owner_id === profile.id && (
                  <button 
                    onClick={() => {
                      setNewChannelType("text");
                      setShowCreateChannelModal(true);
                    }}
                    className="text-zinc-500 hover:text-indigo-400 rounded p-0.5 transition-colors"
                    title="Criar Canal de Texto"
                  >
                    <Plus size={12} />
                  </button>
                )}
              </div>
              {channels
                .filter((c) => c.type === "text")
                .map((chan) => {
                  const isActive = currentChannel?.id === chan.id;
                  return (
                    <div
                      key={chan.id}
                      onClick={() => router.push(`/channels/${currentCommunity.id}/${chan.id}`)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer group transition-all duration-150 ${
                        isActive 
                          ? "bg-zinc-800/80 text-indigo-400 font-semibold border-l-2 border-indigo-500 pl-2" 
                          : "text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <MessageSquare size={14} className={isActive ? "text-indigo-400" : "text-zinc-500"} />
                        <span className="truncate">{chan.name}</span>
                      </div>
                      {currentCommunity.owner_id === profile.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Deseja mesmo excluir o canal #${chan.name}?`)) {
                              deleteChannel(chan.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 p-0.5 rounded transition-opacity"
                          title="Excluir Canal"
                        >
                          <Trash size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Seção Canais de Voz */}
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between px-2 mb-1.5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Canais de Voz
                </span>
                {currentCommunity.owner_id === profile.id && (
                  <button 
                    onClick={() => {
                      setNewChannelType("voice");
                      setShowCreateChannelModal(true);
                    }}
                    className="text-zinc-500 hover:text-indigo-400 rounded p-0.5 transition-colors"
                    title="Criar Canal de Voz"
                  >
                    <Plus size={12} />
                  </button>
                )}
              </div>
              {channels
                .filter((c) => c.type === "voice")
                .map((chan) => {
                  const isActive = currentChannel?.id === chan.id;
                  return (
                    <div key={chan.id} className="flex flex-col gap-0.5">
                      <div
                        onClick={() => router.push(`/channels/${currentCommunity.id}/${chan.id}`)}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer group transition-all duration-150 ${
                          isActive 
                            ? "bg-emerald-950/40 text-emerald-400 font-semibold border-l-2 border-emerald-500 pl-2" 
                            : "text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Volume2 size={14} className={isActive ? "text-emerald-400 animate-pulse" : "text-zinc-500"} />
                          <span className="truncate">{chan.name}</span>
                        </div>
                        {currentCommunity.owner_id === profile.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Deseja mesmo excluir o canal ${chan.name}?`)) {
                                deleteChannel(chan.id);
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 p-0.5 rounded transition-opacity"
                            title="Excluir Canal"
                          >
                            <Trash size={12} />
                          </button>
                        )}
                      </div>

                      {/* Membros Conectados no Canal de Voz (Estilo Discord) */}
                      {isActive && (
                        <div className="flex flex-col gap-1 ml-5 my-0.5 border-l-2 border-emerald-500/30 pl-2.5 py-0.5">
                          <div className="flex items-center gap-2 py-0.5 text-xs">
                            <div className="relative flex items-center justify-center w-5 h-5 rounded-full bg-emerald-650 text-white font-extrabold text-[10px] ring-2 ring-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                              {(profile.display_name || profile.username).substring(0, 1).toUpperCase()}
                              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-zinc-900 animate-ping" />
                            </div>
                            <span className="truncate text-xs font-semibold text-emerald-300">
                              {profile.display_name || profile.username}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-500 text-xs">
            <Compass size={28} className="mb-3 text-zinc-700" />
            <p className="font-semibold text-zinc-400 mb-1">Zyro Space</p>
            Clique no topo para selecionar ou criar um espaço
          </div>
        )}

        {/* RODAPÉ DO USUÁRIO (SLEEK DESIGN) */}
        <div className="flex items-center justify-between h-14 px-3 bg-zinc-950 border-t border-zinc-800/50">
          <div 
            onClick={() => {
              setShowProfileModal(true);
            }}
            className="flex items-center gap-2 cursor-pointer p-1 rounded-lg hover:bg-zinc-900 transition-colors max-w-[130px]"
            title="Configurações de Perfil"
          >
            <Avatar 
              name={profile.display_name || profile.username} 
              src={profile.avatar_url || undefined} 
              status={profile.status} 
              size="sm" 
            />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-zinc-200 truncate">
                {profile.display_name || profile.username}
              </span>
              <span className="text-[9px] text-zinc-500 truncate" title={profile.custom_status || `@${profile.username}`}>
                {profile.custom_status ? `💬 ${profile.custom_status}` : `@${profile.username}`}
              </span>
            </div>
          </div>

          {/* Controles Rápidos */}
          <div className="flex items-center gap-0.5">
            <button 
              onClick={() => setMuted(!muted)}
              className={`p-1.5 rounded-lg hover:bg-zinc-900 transition-colors ${muted ? "text-red-500" : "text-zinc-400 hover:text-zinc-200"}`}
              title={muted ? "Ativar Microfone" : "Mutar Microfone"}
            >
              {muted ? <MicOff size={15} /> : <Mic size={15} />}
            </button>
            <button 
              onClick={() => setDeafened(!deafened)}
              className={`p-1.5 rounded-lg hover:bg-zinc-900 transition-colors ${deafened ? "text-red-500" : "text-zinc-400 hover:text-zinc-200"}`}
              title={deafened ? "Ativar Áudio" : "Mutar Áudio"}
            >
              <Headphones size={15} />
            </button>
            <button 
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-red-950/20 text-zinc-500 hover:text-red-400 transition-colors"
              title="Sair"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>

      </div>

      {/* ÁREA PRINCIPAL DO CONTEÚDO */}
      <div className="flex-1 flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
        {children}
      </div>

      {/* Modais */}
      <Dialog isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Nova Comunidade">
        <form onSubmit={handleCreateCommunity} className="flex flex-col gap-4">
          <Input
            label="Nome da Comunidade"
            placeholder="ex: Canal de Jogos"
            value={commName}
            onChange={(e) => setCommName(e.target.value)}
            required
            disabled={loading}
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={loading}>Criar</Button>
          </div>
        </form>
      </Dialog>

      <Dialog isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} title="Entrar com Código de Convite">
        <form onSubmit={handleJoinCommunity} className="flex flex-col gap-4">
          <p className="text-xs text-zinc-400">
            Digite ou cole o código de convite para se juntar à comunidade.
          </p>
          {joinError && (
            <div className="rounded-lg bg-red-950/50 border border-red-800 p-2.5 text-xs text-red-400">
              {joinError}
            </div>
          )}
          <Input
            label="Código de Convite"
            placeholder="ex: INV-9812A"
            value={joinInviteCode}
            onChange={(e) => setJoinInviteCode(e.target.value)}
            required
            disabled={loading}
          />
          <div className="flex justify-end gap-2 mt-2 border-t border-zinc-800 pt-3">
            <Button type="button" variant="ghost" onClick={() => setShowJoinModal(false)} disabled={loading}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</Button>
          </div>
        </form>
      </Dialog>

      <Dialog isOpen={showInviteModal} onClose={() => { setShowInviteModal(false); setCopied(false); }} title="Convidar para a Comunidade">
        <div className="flex flex-col gap-4">
          <p className="text-xs text-zinc-400">
            Gere um link ou código de convite para enviar aos seus amigos. Quem clicar no link entrará diretamente nesta comunidade!
          </p>
          {inviteCode ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Link de Convite Direto:</span>
                <div className="flex items-center gap-2 p-2 bg-zinc-950 border border-zinc-800 rounded-lg">
                  <input
                    type="text"
                    readOnly
                    value={`${process.env.NEXT_PUBLIC_APP_URL || "https://zyro8837.vercel.app"}/invite/${inviteCode}`}
                    className="flex-1 bg-transparent border-0 outline-none text-xs text-indigo-400 font-mono font-medium truncate"
                  />
                  <Button
                    size="sm"
                    variant={copied ? "secondary" : "primary"}
                    onClick={() => handleCopyInviteLink(inviteCode)}
                  >
                    {copied ? "✓ Copiado!" : "Copiar Link"}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between px-1 text-[11px] text-zinc-500">
                <span>Código Manual: <strong className="font-mono text-zinc-300">{inviteCode}</strong></span>
              </div>
            </div>
          ) : (
            <Button onClick={() => { setCopied(false); handleGenerateInvite(); }} variant="primary" className="w-full" disabled={loading}>
              {loading ? "Gerando..." : "Gerar Link de Convite"}
            </Button>
          )}
          <div className="flex justify-end mt-2 border-t border-zinc-800 pt-3">
            <Button variant="ghost" onClick={() => setShowInviteModal(false)}>Concluído</Button>
          </div>
        </div>
      </Dialog>

      <Dialog isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} title="Painel de Configurações" className="max-w-2xl w-full">
        <form onSubmit={handleUpdateProfile} className="flex gap-5 min-h-[380px] w-full text-zinc-300">
          
          {/* Navegação por Abas (Esquerda) */}
          <div className="w-[160px] shrink-0 border-r border-zinc-800/80 pr-3 flex flex-col gap-1 select-none">
            <button
              type="button"
              onClick={() => setActiveSettingsTab("profile")}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSettingsTab === "profile"
                  ? "bg-zinc-900 text-indigo-400 border-l-2 border-indigo-500 pl-2"
                  : "text-zinc-450 hover:bg-zinc-900 hover:text-zinc-250"
              }`}
            >
              👤 Meu Perfil
            </button>
            <button
              type="button"
              onClick={() => setActiveSettingsTab("media")}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSettingsTab === "media"
                  ? "bg-zinc-900 text-indigo-400 border-l-2 border-indigo-500 pl-2"
                  : "text-zinc-455 hover:bg-zinc-900 hover:text-zinc-250"
              }`}
            >
              🔊 Áudio & Vídeo
            </button>
            <button
              type="button"
              onClick={() => setActiveSettingsTab("appearance")}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSettingsTab === "appearance"
                  ? "bg-zinc-900 text-indigo-400 border-l-2 border-indigo-500 pl-2"
                  : "text-zinc-455 hover:bg-zinc-900 hover:text-zinc-250"
              }`}
            >
              🎨 Aparência
            </button>
          </div>

          {/* Conteúdo da Aba Ativa (Direita) */}
          <div className="flex-1 flex flex-col gap-3 min-w-0 max-h-[460px] overflow-y-auto pr-1">
            
            {/* ABA MEU PERFIL */}
            {activeSettingsTab === "profile" && (
              <div className="flex gap-4 items-start">
                {/* Inputs de Formulário */}
                <div className="flex-1 flex flex-col gap-3 min-w-0">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Status de Presença</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {(["online", "idle", "do_not_disturb", "offline"] as const).map((st) => {
                        const label = st === "online" ? "Online" :
                                      st === "idle" ? "Ausente" :
                                      st === "do_not_disturb" ? "Não Perturbar" : "Invisível";
                        const color = st === "online" ? "bg-emerald-500" :
                                      st === "idle" ? "bg-amber-500" :
                                      st === "do_not_disturb" ? "bg-red-500" : "bg-zinc-500";
                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => updateProfileStatus(st)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-lg border transition-all ${
                              profile?.status === st 
                                ? "bg-indigo-650/20 border-indigo-500 text-indigo-400 font-semibold" 
                                : "border-zinc-850 bg-zinc-950 text-zinc-450 hover:bg-zinc-900 hover:text-zinc-200"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
                            <span>{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Input
                    label="Nome de Exibição"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="Nome visível para os outros"
                    disabled={loading}
                  />

                  <Input
                    label="Foto de Perfil (URL)"
                    value={newAvatarUrl}
                    onChange={(e) => setNewAvatarUrl(e.target.value)}
                    placeholder="Link da imagem (ex: https://...)"
                    disabled={loading}
                  />

                  <Input
                    label="Frase de Status personalizada"
                    value={newCustomStatus}
                    onChange={(e) => setNewCustomStatus(e.target.value)}
                    placeholder="O que você está fazendo? (ex: Jogando Zyro)"
                    disabled={loading}
                  />

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Biografia</label>
                    <textarea
                      value={newBio}
                      onChange={(e) => setNewBio(e.target.value)}
                      placeholder="Fale um pouco sobre você..."
                      disabled={loading}
                      className="flex w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-550 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[70px] resize-none"
                    />
                  </div>

                  {/* Seleção de Cor de Destaque */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Cor do Perfil</label>
                    <div className="flex gap-2">
                      {[
                        { key: "indigo", bg: "bg-indigo-500" },
                        { key: "emerald", bg: "bg-emerald-500" },
                        { key: "rose", bg: "bg-rose-500" },
                        { key: "amber", bg: "bg-amber-500" },
                        { key: "purple", bg: "bg-purple-500" },
                        { key: "cyan", bg: "bg-cyan-500" }
                      ].map((col) => (
                        <button
                          key={col.key}
                          type="button"
                          onClick={() => setNewProfileColor(col.key)}
                          className={`w-6 h-6 rounded-full transition-transform ${col.bg} ${
                            newProfileColor === col.key ? "ring-2 ring-white scale-110" : "hover:scale-105"
                          }`}
                          title={col.key}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Pré-visualização Live do Cartão do Usuário */}
                <div className="w-[200px] shrink-0 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col self-start select-none">
                  {/* Banner */}
                  <div className={`h-14 w-full relative transition-all duration-300 ${
                    newProfileColor === "indigo" ? "bg-indigo-650" :
                    newProfileColor === "emerald" ? "bg-emerald-600" :
                    newProfileColor === "rose" ? "bg-rose-600" :
                    newProfileColor === "amber" ? "bg-amber-600" :
                    newProfileColor === "purple" ? "bg-purple-600" : "bg-cyan-600"
                  }`} />
                  
                  {/* Informações */}
                  <div className="px-3 pb-3 pt-8 relative flex flex-col gap-2">
                    {/* Avatar sobreposto */}
                    <div className="absolute -top-7 left-3">
                      <div className="relative w-12 h-12 rounded-full border-[3px] border-zinc-950 bg-zinc-900 overflow-hidden">
                        {newAvatarUrl.trim() ? (
                          <img src={newAvatarUrl.trim()} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-400 font-bold text-xs bg-zinc-850">
                            {newDisplayName.substring(0, 2).toUpperCase() || profile?.username.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        {/* Indicador de Status */}
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-zinc-950 ${
                          profile?.status === "online" ? "bg-emerald-500" :
                          profile?.status === "idle" ? "bg-amber-500" :
                          profile?.status === "do_not_disturb" ? "bg-red-500" : "bg-zinc-500"
                        }`} />
                      </div>
                    </div>

                    {/* Nomes */}
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-black text-zinc-100 truncate">{newDisplayName.trim() || profile?.display_name || "Usuário"}</span>
                      <span className="text-[10px] text-zinc-500 truncate">@{profile?.username}</span>
                    </div>

                    {/* Mensagem de status */}
                    {newCustomStatus.trim() && (
                      <div className="bg-zinc-900 border border-zinc-850 p-1.5 rounded-lg text-[9px] text-zinc-350 flex items-start gap-1">
                        <span className="shrink-0">💬</span>
                        <span className="break-words italic leading-tight">{newCustomStatus.trim()}</span>
                      </div>
                    )}

                    {/* Biografia */}
                    <div className="border-t border-zinc-900/60 pt-2 flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">Sobre Mim</span>
                      <p className="text-[10px] text-zinc-450 leading-relaxed break-words max-h-[70px] overflow-y-auto pr-1">
                        {newBio.trim() ? newBio.trim() : "Nenhuma biografia fornecida."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ABA ÁUDIO & VÍDEO */}
            {activeSettingsTab === "media" && (
              <div className="flex flex-col gap-3.5">
                {/* Medidor de microfone interativo */}
                <div className="bg-zinc-900/40 border border-zinc-850 p-3 rounded-xl flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-zinc-400">Teste de Entrada de Voz</span>
                    <span className="text-zinc-500 text-[10px]">Fale no microfone para testar</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-950 border border-zinc-900 rounded-full overflow-hidden flex">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-75 shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                      style={{ width: `${micLevel}%` }} 
                    />
                  </div>
                </div>

                {/* Microfone */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-450 uppercase tracking-wider">Microfone (Entrada)</label>
                  <select
                    value={selectedMic}
                    onChange={(e) => setSelectedMic(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2 text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Padrão do Sistema</option>
                    {mics.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microfone ${device.deviceId.substring(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Alto-falantes */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-450 uppercase tracking-wider">Alto-falantes (Saída)</label>
                  <select
                    value={selectedSpeaker}
                    onChange={(e) => setSelectedSpeaker(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2 text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Padrão do Sistema</option>
                    {speakers.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Saída ${device.deviceId.substring(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Câmera */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-450 uppercase tracking-wider">Câmera (Vídeo)</label>
                  <select
                    value={selectedCam}
                    onChange={(e) => setSelectedCam(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2 text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Padrão do Sistema</option>
                    {cameras.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Câmera ${device.deviceId.substring(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* ABA APARÊNCIA */}
            {activeSettingsTab === "appearance" && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tema de Cores da Plataforma</span>
                  <p className="text-[10px] text-zinc-550">Escolha o sotaque de cores de foco do aplicativo.</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: "indigo", label: "Neon Indigo", color: "bg-indigo-600", border: "border-indigo-500" },
                    { key: "emerald", label: "Forest Emerald", color: "bg-emerald-600", border: "border-emerald-500" },
                    { key: "rose", label: "Crimson Rose", color: "bg-rose-600", border: "border-rose-500" }
                  ].map((theme) => (
                    <div
                      key={theme.key}
                      onClick={() => setSelectedTheme(theme.key)}
                      className={`flex flex-col gap-2 p-3 bg-zinc-900/60 border rounded-xl cursor-pointer transition-all hover:bg-zinc-850 ${
                        selectedTheme === theme.key ? `border-2 ${theme.border}` : "border-zinc-850"
                      }`}
                    >
                      <div className={`w-full h-8 rounded-lg ${theme.color}`} />
                      <span className="text-[11px] text-center text-zinc-300 font-bold">{theme.label}</span>
                    </div>
                  ))}
                </div>

                {/* Simulação de Mensagem com o Tema */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-3 flex flex-col gap-2">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Pré-visualização do Chat</span>
                  <div className="flex gap-2.5 items-start">
                    <div className="w-7 h-7 rounded-full bg-zinc-800 shrink-0 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                      ZY
                    </div>
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="font-bold text-zinc-200">Zyro</span>
                        <span className="text-[9px] text-zinc-550">12:00</span>
                      </div>
                      <div className="text-[11px] text-zinc-400 leading-normal">
                        Esta é uma visualização para você ver como o seletor visual e as pílulas mudam de sotaque!
                      </div>
                      <div className="flex gap-2 mt-1">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-semibold text-white ${
                          selectedTheme === "indigo" ? "bg-indigo-650 shadow-[0_0_6px_rgba(99,102,241,0.4)]" :
                          selectedTheme === "emerald" ? "bg-emerald-600 shadow-[0_0_6px_rgba(16,185,129,0.4)]" :
                          "bg-rose-600 shadow-[0_0_6px_rgba(244,63,94,0.4)]"
                        }`}>
                          Tag Temática
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-zinc-800/80">
              <Button type="button" variant="ghost" onClick={() => setShowProfileModal(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={loading}>Salvar Alterações</Button>
            </div>
          </div>
        </form>
      </Dialog>

      {/* Criar Canal Modal */}
      <Dialog 
        isOpen={showCreateChannelModal} 
        onClose={() => { setShowCreateChannelModal(false); setNewChannelName(""); }} 
        title={`Criar Canal de ${newChannelType === "text" ? "Texto" : "Voz"}`}
      >
        <form 
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newChannelName.trim()) return;
            setLoading(true);
            try {
              // Formatar nome do canal de texto para minúsculas e hífens
              const name = newChannelType === "text" 
                ? newChannelName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "")
                : newChannelName.trim();
              
              await createChannel(name, newChannelType);
              setShowCreateChannelModal(false);
              setNewChannelName("");
            } catch (err) {
              console.error(err);
            } finally {
              setLoading(false);
            }
          }} 
          className="flex flex-col gap-4"
        >
          <Input
            label="Nome do Canal"
            placeholder={newChannelType === "text" ? "ex: avisos-gerais" : "ex: Sala de Voz"}
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
            required
            disabled={loading}
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => { setShowCreateChannelModal(false); setNewChannelName(""); }} 
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              Criar Canal
            </Button>
          </div>
        </form>
      </Dialog>

    </div>
  );
}
