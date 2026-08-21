"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppStore, supabase } from "@zyro/shared";
import { Avatar, Button, Input } from "@zyro/ui";
import dynamic from "next/dynamic";

const LiveKitRoom = dynamic(
  () => import("@livekit/components-react").then((mod) => mod.LiveKitRoom),
  { ssr: false }
);

const VideoConference = dynamic(
  () => import("@livekit/components-react").then((mod) => mod.VideoConference),
  { ssr: false }
);

const RoomAudioRenderer = dynamic(
  () => import("@livekit/components-react").then((mod) => mod.RoomAudioRenderer),
  { ssr: false }
);
import { 
  useParticipants,
  useIsSpeaking,
  useLocalParticipant,
} from "@livekit/components-react";

import { 
  Send, 
  Hash, 
  Volume2, 
  Video, 
  VideoOff,
  Monitor, 
  PhoneOff, 
  Plus, 
  UserPlus, 
  Info,
  Mic,
  MicOff,
  Edit,
  Trash2,
  CornerUpLeft,
  Paperclip,
  Smile,
  FileText,
  X
} from "lucide-react";

function DiscordVoiceTile({ participant }: { participant: any }) {
  const isSpeaking = useIsSpeaking({ participant });
  const isMicEnabled = participant.isMicrophoneEnabled;
  const name = participant.name || participant.identity || "Membro";

  return (
    <div
      className={`relative flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-900/90 border transition-all duration-200 overflow-hidden shadow-xl ${
        isSpeaking
          ? "border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.5)] ring-2 ring-emerald-500/60 scale-[1.02]"
          : "border-zinc-800/80 hover:border-zinc-700"
      }`}
      style={{ aspectRatio: "16/9", minHeight: "180px" }}
    >
      {/* Indicador de Fala (Bandeira no Topo) */}
      {isSpeaking && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-[11px] font-bold text-emerald-400 backdrop-blur-md animate-pulse">
          <Volume2 size={13} className="animate-bounce" />
          <span>Falando</span>
        </div>
      )}

      {/* Indicador de Mudo */}
      {!isMicEnabled && (
        <div className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-red-950/80 border border-red-800 text-red-400 backdrop-blur-md" title="Microfone Mutado">
          <MicOff size={14} />
        </div>
      )}

      {/* Visual do Participante */}
      <div className="flex flex-col items-center justify-center gap-3">
        <div
          className={`relative flex items-center justify-center w-20 h-20 rounded-full font-extrabold text-2xl transition-all duration-200 ${
            isSpeaking
              ? "bg-emerald-650 text-white ring-4 ring-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.8)] scale-105"
              : "bg-indigo-650 text-white border-2 border-zinc-700 shadow-md"
          }`}
        >
          {name.substring(0, 2).toUpperCase()}
        </div>
        <span className={`text-sm font-bold truncate max-w-[160px] ${isSpeaking ? "text-emerald-300 font-extrabold" : "text-zinc-200"}`}>
          {name}
        </span>
      </div>
    </div>
  );
}

function DiscordVoiceControls({ onDisconnect }: { onDisconnect: () => void }) {
  const { localParticipant } = useLocalParticipant();
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);

  const toggleMic = async () => {
    if (localParticipant) {
      const next = !micEnabled;
      await localParticipant.setMicrophoneEnabled(next);
      setMicEnabled(next);
    }
  };

  const toggleCam = async () => {
    if (localParticipant) {
      const next = !camEnabled;
      await localParticipant.setCameraEnabled(next);
      setCamEnabled(next);
    }
  };

  const toggleScreen = async () => {
    if (localParticipant) {
      const next = !screenSharing;
      await localParticipant.setScreenShareEnabled(next);
      setScreenSharing(next);
    }
  };

  return (
    <div className="h-16 bg-zinc-900/90 border-t border-zinc-800 px-6 flex items-center justify-center gap-4 select-none backdrop-blur-md">
      <button
        onClick={toggleMic}
        className={`flex items-center justify-center w-11 h-11 rounded-full transition-all ${
          micEnabled
            ? "bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700"
            : "bg-red-950/80 border border-red-800 text-red-400 hover:bg-red-900"
        }`}
        title={micEnabled ? "Mutar Microfone" : "Desmutar Microfone"}
      >
        {micEnabled ? <Mic size={18} /> : <MicOff size={18} />}
      </button>

      <button
        onClick={toggleCam}
        className={`flex items-center justify-center w-11 h-11 rounded-full transition-all ${
          camEnabled
            ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg"
            : "bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700"
        }`}
        title={camEnabled ? "Desativar Câmera" : "Ativar Câmera"}
      >
        {camEnabled ? <Video size={18} /> : <VideoOff size={18} />}
      </button>

      <button
        onClick={toggleScreen}
        className={`flex items-center justify-center w-11 h-11 rounded-full transition-all ${
          screenSharing
            ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg"
            : "bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700"
        }`}
        title={screenSharing ? "Parar Compartilhamento" : "Compartilhar Tela"}
      >
        <Monitor size={18} />
      </button>

      <div className="w-[1px] h-6 bg-zinc-800 mx-2" />

      <button
        onClick={onDisconnect}
        className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-lg hover:shadow-red-600/30"
        title="Desconectar da Chamada"
      >
        <PhoneOff size={16} />
        <span>Desconectar</span>
      </button>
    </div>
  );
}

function DiscordVoiceGrid({ onDisconnect }: { onDisconnect: () => void }) {
  const participants = useParticipants();

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950">
      <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-center justify-center">
        {participants.map((p) => (
          <DiscordVoiceTile key={p.sid || p.identity} participant={p} />
        ))}
      </div>
      <DiscordVoiceControls onDisconnect={onDisconnect} />
    </div>
  );
}

export default function ChannelPage() {
  const router = useRouter();
  const { communityId, channelId } = useParams() as { communityId: string; channelId: string };
  
  const profile = useAppStore((state) => state.profile);
  const channels = useAppStore((state) => state.channels);
  const currentChannel = useAppStore((state) => state.currentChannel);
  const currentCommunity = useAppStore((state) => state.currentCommunity);
  const messages = useAppStore((state) => state.messages[channelId] || []);
  const addMessage = useAppStore((state) => state.addMessage);
  const setMessages = useAppStore((state) => state.setMessages);
  const updateMessageInState = useAppStore((state) => state.updateMessageInState);
  const deleteMessageFromState = useAppStore((state) => state.deleteMessageFromState);

  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados Simulados para Chamada de Voz / Vídeo
  const [inCall, setInCall] = useState(false);
  const [videoOn, setVideoOn] = useState(false);
  const [screenShareOn, setScreenShareOn] = useState(false);
  const [muted, setMuted] = useState(false);
  const [liveKitToken, setLiveKitToken] = useState<string | null>(null);

  // Preferências de Hardware (Fase 5)
  const [preferredMic, setPreferredMic] = useState("");
  const [preferredCam, setPreferredCam] = useState("");

  useEffect(() => {
    if (inCall && typeof window !== "undefined") {
      setPreferredMic(localStorage.getItem("zyro_preferred_mic") || "");
      setPreferredCam(localStorage.getItem("zyro_preferred_cam") || "");
    }
  }, [inCall]);

  // Estados de Chat Avançado (Fase 3)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editInputText, setEditInputText] = useState("");
  const [replyingToMessage, setReplyingToMessage] = useState<any | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Redirecionamento de canal default para o primeiro canal válido da comunidade
  useEffect(() => {
    if (channelId === "default" && channels && channels.length > 0) {
      const textChans = channels.filter((c) => c.type === "text");
      if (textChans.length > 0) {
        router.replace(`/channels/${communityId}/${textChans[0].id}`);
      } else if (channels[0]?.id) {
        router.replace(`/channels/${communityId}/${channels[0].id}`);
      }
    }
  }, [channelId, channels, communityId, router]);

  // Carregar Histórico de Mensagens e Subscrever Tempo Real
  useEffect(() => {
    if (!channelId || channelId === "default") return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*, profiles(*), message_reactions(*), attachments(*)")
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Erro ao carregar mensagens:", error);
      } else if (data) {
        setMessages(channelId, data);
      }
    };

    fetchMessages();

    // Inscrição Realtime de Mensagens
    const channelSub = supabase
      .channel(`chat:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          const { data: prof } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", payload.new.user_id)
            .single();

          const fullMsg = {
            ...payload.new,
            profiles: prof || undefined,
            message_reactions: [],
            attachments: [],
          };
          addMessage(channelId, fullMsg as any);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          const { data: prof } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", payload.new.user_id)
            .single();

          const currentMessages = useAppStore.getState().messages[channelId] || [];
          const existing = currentMessages.find((m) => m.id === payload.new.id);

          const fullMsg = {
            ...payload.new,
            profiles: prof || undefined,
            message_reactions: existing?.message_reactions || [],
            attachments: existing?.attachments || [],
          };
          updateMessageInState(channelId, fullMsg as any);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          deleteMessageFromState(channelId, payload.old.id);
        }
      )
      .subscribe();

    // Inscrição Realtime para Reações e Anexos
    const extraSub = supabase
      .channel(`extra:${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions" },
        () => {
          fetchMessages();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attachments" },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelSub);
      supabase.removeChannel(extraSub);
    };
  }, [channelId, setMessages, addMessage, updateMessageInState, deleteMessageFromState]);

  // Scroll automático para a última mensagem
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !profile) return;
    const textToSend = inputText.trim();
    setInputText("");

    try {
      const messageBody: any = {
        channel_id: channelId,
        user_id: profile.id,
        content: textToSend,
      };

      if (replyingToMessage) {
        messageBody.reply_to = replyingToMessage.id;
        setReplyingToMessage(null);
      }

      const { error } = await supabase
        .from("messages")
        .insert(messageBody);

      if (error) throw error;
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
    }
  };

  const handleEditMessage = async (messageId: string, content: string) => {
    if (!content.trim()) return;
    try {
      const { error } = await supabase
        .from("messages")
        .update({
          content: content.trim(),
          edited_at: new Date().toISOString(),
        })
        .eq("id", messageId);

      if (error) throw error;
      setEditingMessageId(null);
    } catch (err) {
      console.error("Erro ao editar mensagem:", err);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm("Deseja mesmo excluir esta mensagem?")) return;
    try {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;
    } catch (err) {
      console.error("Erro ao excluir mensagem:", err);
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!profile) return;
    try {
      const { data: existingReaction } = await supabase
        .from("message_reactions")
        .select("id")
        .eq("message_id", messageId)
        .eq("user_id", profile.id)
        .eq("emoji", emoji)
        .maybeSingle();

      if (existingReaction) {
        await supabase
          .from("message_reactions")
          .delete()
          .eq("id", existingReaction.id);
      } else {
        await supabase
          .from("message_reactions")
          .insert({
            message_id: messageId,
            user_id: profile.id,
            emoji: emoji,
          });
      }
    } catch (err) {
      console.error("Erro ao alternar reação:", err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploadingFile(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${communityId}/${channelId}/${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: message, error: msgError } = await supabase
        .from("messages")
        .insert({
          channel_id: channelId,
          user_id: profile.id,
          content: `Enviou o arquivo: **${file.name}**`,
        })
        .select()
        .single();

      if (msgError) throw msgError;

      if (message) {
        const { error: attachError } = await supabase
          .from("attachments")
          .insert({
            message_id: message.id,
            user_id: profile.id,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            storage_path: filePath,
          });

        if (attachError) throw attachError;
      }
    } catch (err) {
      console.error("Erro no upload do arquivo:", err);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleConnectVoice = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const response = await fetch("/api/livekit-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channelId: channelId,
          username: profile.display_name || profile.username,
        }),
      });
      const data = await response.json();
      if (data.token) {
        setLiveKitToken(data.token);
        setInCall(true);
      } else {
        alert("Erro ao obter token do LiveKit: " + (data.error || "Erro desconhecido"));
      }
    } catch (err: any) {
      console.error("Erro na chamada de voz:", err);
      alert("Falha ao se conectar ao servidor de voz.");
    } finally {
      setLoading(false);
    }
  };

  if (channelId === "default" || !currentChannel) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-550 p-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mb-2" />
        Carregando canal...
      </div>
    );
  }

  // Autoconectar ao canal de voz assim que o usuário entra na pagina
  useEffect(() => {
    if (currentChannel?.type === "voice" && !inCall && !liveKitToken && !loading && profile) {
      handleConnectVoice();
    }
  }, [currentChannel?.id, currentChannel?.type, inCall, liveKitToken, loading, profile]);

  // RENDER CANAL DE VOZ (ESTILO DISCORD COM INDICADORES DE FALA EM TEMPO REAL)
  if (currentChannel.type === "voice") {
    return (
      <div className="flex-1 flex flex-col h-full bg-zinc-950">
        {/* Topbar */}
        <div className="flex items-center h-12 px-4 border-b border-zinc-900 bg-zinc-900 justify-between text-zinc-250 select-none">
          <div className="flex items-center gap-2 font-bold text-sm text-zinc-200">
            <Volume2 size={18} className="text-emerald-400" />
            <span>{currentChannel.name}</span>
          </div>
          <div className="flex items-center gap-2 text-xs bg-emerald-950/40 border border-emerald-800/60 px-3 py-1 rounded-full text-emerald-400 font-semibold shadow-sm">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
            Voz em Tempo Real
          </div>
        </div>

        {/* Call Panel */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {inCall && liveKitToken ? (
            <LiveKitRoom
              video={false}
              audio={true}
              token={liveKitToken}
              serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://demo.livekit.cloud"}
              options={{
                audioCaptureDefaults: preferredMic ? { deviceId: preferredMic } : undefined,
                videoCaptureDefaults: preferredCam ? { deviceId: preferredCam } : undefined,
              }}
              data-lk-theme="default"
              style={{ height: "100%", display: "flex", flexDirection: "column" }}
              onDisconnected={() => {
                setInCall(false);
                setLiveKitToken(null);
              }}
            >
              <DiscordVoiceGrid onDisconnect={() => {
                setInCall(false);
                setLiveKitToken(null);
              }} />
              <RoomAudioRenderer />
            </LiveKitRoom>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4 text-center max-w-sm mx-auto">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-950/60 border border-emerald-800 text-emerald-400 shadow-xl">
                <Volume2 size={36} className="animate-pulse" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-bold text-zinc-200">Conectando ao Canal de Voz...</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Estabelecendo conexão privada em tempo real.
                </p>
              </div>
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent mt-2" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // RENDER CANAL DE TEXTO
  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950">
      {/* Topbar */}
      <div className="flex items-center h-12 px-4 border-b border-zinc-900 bg-zinc-900 justify-between text-zinc-250 select-none" style={{ WebkitAppRegion: "drag" } as any}>
        <div className="flex items-center gap-2 font-bold text-sm text-zinc-200" style={{ WebkitAppRegion: "no-drag" } as any}>
          <Hash size={18} className="text-zinc-450" />
          <span>{currentChannel.name}</span>
        </div>
      </div>

      {/* Histórico do Chat */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-zinc-650 gap-2">
            <Hash size={40} className="text-zinc-800" />
            <div className="flex flex-col">
              <h4 className="text-sm font-bold text-zinc-500">Este é o início do canal #{currentChannel.name}</h4>
              <p className="text-xs text-zinc-600">Envie uma mensagem para começar a conversa!</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const time = new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const authorName = msg.profiles?.display_name || msg.profiles?.username || "Usuário";
            const isEditing = editingMessageId === msg.id;
            
            // Buscar citação de resposta
            const repliedMessage = msg.reply_to ? messages.find((m) => m.id === msg.reply_to) : null;
            const repliedAuthor = repliedMessage?.profiles?.display_name || repliedMessage?.profiles?.username || "Usuário";

            // Agrupar reações por emoji
            const reactionsGrouped = (msg.message_reactions || []).reduce((acc: any, curr: any) => {
              if (!acc[curr.emoji]) {
                acc[curr.emoji] = { count: 0, users: [], userReacted: false };
              }
              acc[curr.emoji].count += 1;
              acc[curr.emoji].users.push(curr.user_id);
              if (profile && curr.user_id === profile.id) {
                acc[curr.emoji].userReacted = true;
              }
              return acc;
            }, {});

            return (
              <div key={msg.id} className="flex flex-col gap-1 hover:bg-zinc-900/20 px-2 py-1.5 rounded-lg group relative transition-colors">
                
                {/* Exibir Citação da Resposta */}
                {repliedMessage && (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-550 ml-11 mb-0.5 select-none">
                    <CornerUpLeft size={12} className="text-zinc-600" />
                    <span className="font-bold text-zinc-400">@{repliedAuthor}</span>
                    <span className="truncate max-w-[200px] italic">"{repliedMessage.content}"</span>
                  </div>
                )}

                <div className="flex gap-3 text-sm">
                  <Avatar name={authorName} src={msg.profiles?.avatar_url} size="sm" />
                  
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex items-baseline gap-2 select-none">
                      <span className="font-bold text-zinc-200 text-xs">
                        {authorName}
                      </span>
                      <span className="text-[9px] text-zinc-600">
                        {time}
                      </span>
                      {msg.edited_at && (
                        <span className="text-[9px] text-zinc-600" title={new Date(msg.edited_at).toLocaleString()}>
                          (editado)
                        </span>
                      )}
                    </div>

                    {/* Conteúdo da Mensagem ou Input de Edição */}
                    {isEditing ? (
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleEditMessage(msg.id, editInputText);
                        }}
                        className="flex items-center gap-2 mt-1 w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1"
                      >
                        <input
                          type="text"
                          value={editInputText}
                          onChange={(e) => setEditInputText(e.target.value)}
                          className="flex-1 bg-transparent border-0 outline-none text-sm text-zinc-200"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Escape") setEditingMessageId(null);
                          }}
                        />
                        <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                          <button type="submit" className="text-indigo-400 font-bold hover:underline">Salvar</button>
                          <span>•</span>
                          <button type="button" onClick={() => setEditingMessageId(null)} className="hover:underline">Cancelar</button>
                        </div>
                      </form>
                    ) : (
                      <p className="text-zinc-300 leading-relaxed text-sm mt-0.5 break-all">
                        {msg.content}
                      </p>
                    )}

                    {/* Exibir Anexos */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-col gap-2 mt-1.5">
                        {msg.attachments.map((att: any) => {
                          const isImage = att?.file_type?.startsWith("image/") ?? false;
                          const publicUrl = supabase.storage
                            .from("attachments")
                            .getPublicUrl(att.storage_path).data.publicUrl;

                          if (isImage) {
                            return (
                              <div key={att.id} className="rounded-lg overflow-hidden border border-zinc-800/80 max-w-sm">
                                <img src={publicUrl} alt={att.file_name} className="max-h-60 w-auto object-contain cursor-zoom-in" />
                              </div>
                            );
                          }
                          return (
                            <a
                              key={att.id}
                              href={publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-2.5 rounded-lg border border-zinc-800 bg-zinc-900 max-w-sm hover:bg-zinc-850 transition-colors"
                            >
                              <FileText size={20} className="text-zinc-450" />
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-zinc-200 truncate">{att.file_name}</span>
                                <span className="text-[10px] text-zinc-550">
                                  {(att.file_size / 1024).toFixed(1)} KB
                                </span>
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    )}

                    {/* Barra de Reações de Emojis */}
                    {Object.keys(reactionsGrouped).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {Object.entries(reactionsGrouped).map(([emoji, data]: any) => (
                          <button
                            key={emoji}
                            onClick={() => handleToggleReaction(msg.id, emoji)}
                            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-xs transition-colors ${
                              data.userReacted
                                ? "bg-indigo-650/15 border-indigo-500 text-indigo-400 font-bold"
                                : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-200"
                            }`}
                          >
                            <span>{emoji}</span>
                            <span className="text-[10px]">{data.count}</span>
                          </button>
                        ))}
                      </div>
                    )}

                  </div>
                </div>

                {/* Painel de Ações Rápidas (Apenas no Hover) */}
                {!isEditing && (
                  <div className="absolute right-3 top-[-10px] z-10 hidden group-hover:flex items-center gap-0.5 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 shadow-xl select-none">
                    
                    {/* Botões rápidos de Emojis */}
                    {(["👍", "❤️", "😂", "🎉"] as const).map((em) => (
                      <button
                        key={em}
                        onClick={() => handleToggleReaction(msg.id, em)}
                        className="hover:bg-zinc-800 p-1 text-xs rounded transition-colors"
                        title={em}
                      >
                        {em}
                      </button>
                    ))}
                    
                    <div className="w-[1px] h-3.5 bg-zinc-800 mx-1" />

                    <button
                      onClick={() => setReplyingToMessage(msg)}
                      className="hover:bg-zinc-800 p-1 text-zinc-400 hover:text-zinc-200 rounded transition-colors"
                      title="Responder"
                    >
                      <CornerUpLeft size={13} />
                    </button>
                    
                    {profile && msg.user_id === profile.id && (
                      <button
                        onClick={() => {
                          setEditingMessageId(msg.id);
                          setEditInputText(msg.content);
                        }}
                        className="hover:bg-zinc-800 p-1 text-zinc-400 hover:text-zinc-200 rounded transition-colors"
                        title="Editar Mensagem"
                      >
                        <Edit size={13} />
                      </button>
                    )}

                    {profile && (msg.user_id === profile.id || currentCommunity?.owner_id === profile.id) && (
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="hover:bg-zinc-800 p-1 text-zinc-400 hover:text-red-400 rounded transition-colors"
                        title="Excluir Mensagem"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                )}

              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input de Arquivo (Escondido) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Campo de Entrada de Mensagem com Citação de Resposta */}
      <div className="p-4 bg-zinc-950 flex flex-col">
        
        {/* Banner de Resposta Ativa */}
        {replyingToMessage && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-x border-t border-zinc-800 rounded-t-lg text-xs text-zinc-400">
            <div className="flex items-center gap-1.5 truncate">
              <CornerUpLeft size={12} className="text-zinc-500 animate-pulse" />
              <span>Respondendo a</span>
              <span className="font-bold text-zinc-300">
                @{replyingToMessage.profiles?.display_name || replyingToMessage.profiles?.username || "Usuário"}
              </span>
            </div>
            <button 
              onClick={() => setReplyingToMessage(null)}
              className="text-zinc-500 hover:text-red-400 transition-colors"
              title="Cancelar Resposta"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <form 
          onSubmit={handleSendMessage} 
          className={`flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 ${
            replyingToMessage ? "rounded-b-lg border-t-0" : "rounded-lg"
          }`}
        >
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile}
            className="text-zinc-450 hover:text-zinc-200 disabled:opacity-30 p-1 rounded hover:bg-zinc-800 transition-colors"
            title="Anexar Arquivo"
          >
            {uploadingFile ? (
              <div className="w-4 h-4 animate-spin rounded-full border border-indigo-500 border-t-transparent" />
            ) : (
              <Paperclip size={18} />
            )}
          </button>
          
          <input
            type="text"
            placeholder={uploadingFile ? "Carregando arquivo..." : `Conversar em #${currentChannel.name}`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-transparent border-0 outline-none text-sm text-zinc-200 placeholder:text-zinc-550"
            disabled={loading || uploadingFile}
          />
          
          <button 
            type="submit" 
            disabled={!inputText.trim() || loading || uploadingFile}
            className="text-indigo-400 hover:text-indigo-300 disabled:opacity-30 p-1 rounded hover:bg-zinc-800 transition-colors"
            title="Enviar"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
