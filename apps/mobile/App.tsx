import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAppStore, supabase } from '@zyro/shared';
import {
  Send,
  Hash,
  Volume2,
  PhoneOff,
  Plus,
  UserPlus,
  Mic,
  MicOff,
  LogOut,
  CornerUpLeft,
  Paperclip,
  X,
  Menu,
  ChevronDown,
  Lock,
  Headphones,
  Settings,
} from 'lucide-react-native';

// Optional LiveKit import for voice call support
let LiveKitRoom: any = null;
let RoomAudioRenderer: any = null;
try {
  const lk = require('@livekit/react-native');
  LiveKitRoom = lk.LiveKitRoom;
  RoomAudioRenderer = lk.RoomAudioRenderer;
} catch (e) {
  console.warn('LiveKit React Native components not available.');
}

// ---------------------------------------------------------
// REUSABLE NATIVE COMPONENTS
// ---------------------------------------------------------

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name ? name.substring(0, 2).toUpperCase() : '??';
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
}) {
  return (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#52525b"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize="none"
      />
    </View>
  );
}

function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
}) {
  const btnStyle =
    variant === 'primary'
      ? styles.btnPrimary
      : variant === 'danger'
      ? styles.btnDanger
      : styles.btnSecondary;
  const txtStyle =
    variant === 'primary' || variant === 'danger' ? styles.btnTextWhite : styles.btnTextDark;

  return (
    <TouchableOpacity style={[styles.btn, btnStyle]} onPress={onPress} disabled={loading}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : '#000'} size="small" />
      ) : (
        <Text style={[styles.btnText, txtStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------
// MAIN APPLICATION COMPONENT
// ---------------------------------------------------------

export default function App() {
  const session = useAppStore((state) => state.session);
  const profile = useAppStore((state) => state.profile);
  const communities = useAppStore((state) => state.communities);
  const currentCommunity = useAppStore((state) => state.currentCommunity);
  const currentChannel = useAppStore((state) => state.currentChannel);
  const channels = useAppStore((state) => state.channels);
  const messages = useAppStore((state) => state.messages[currentChannel?.id || ''] || []);
  const isLoading = useAppStore((state) => state.isLoading);

  const initializeAuth = useAppStore((state) => state.initializeAuth);
  const loadCommunities = useAppStore((state) => state.loadCommunities);
  const setCurrentCommunity = useAppStore((state) => state.setCurrentCommunity);
  const setCurrentChannel = useAppStore((state) => state.setCurrentChannel);
  const addMessage = useAppStore((state) => state.addMessage);
  const setMessages = useAppStore((state) => state.setMessages);
  const createChannel = useAppStore((state) => state.createChannel);
  const deleteChannel = useAppStore((state) => state.deleteChannel);
  const signOut = useAppStore((state) => state.signOut);

  // Native Navigation State
  const [screen, setScreen] = useState<'login' | 'signup' | 'onboarding' | 'main'>('login');

  // Auth Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  // Chat/Sidebar State
  const [inputText, setInputText] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCommunityList, setShowCommunityList] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<any | null>(null);

  // Modal / Input states
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<'text' | 'voice'>('text');
  
  const [showCreateCommunityModal, setShowCreateCommunityModal] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState('');
  
  const [showJoinCommunityModal, setShowJoinCommunityModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  // Voice call states
  const [inCall, setInCall] = useState(false);
  const [liveKitToken, setLiveKitToken] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);

  const listRef = useRef<FlatList>(null);

  // Initialize Authentication on load
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Handle auth redirection
  useEffect(() => {
    if (!isLoading) {
      if (!session) {
        setScreen('login');
      } else if (communities.length === 0) {
        setScreen('onboarding');
      } else {
        setScreen('main');
      }
    }
  }, [session, communities, isLoading]);

  // Load channels when community changes
  useEffect(() => {
    if (currentCommunity) {
      useAppStore.getState().loadChannels(currentCommunity.id);
    }
  }, [currentCommunity]);

  // Load and Subscribe to Messages in Main Screen
  useEffect(() => {
    const activeChanId = currentChannel?.id;
    if (!activeChanId || screen !== 'main') return;

    // 1. Fetch channel messages
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*, profiles(*), message_reactions(*), attachments(*)')
        .eq('channel_id', activeChanId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages on mobile:', error);
      } else if (data) {
        setMessages(activeChanId, data as any);
      }
    };

    fetchMessages();

    // 2. Realtime message subscription
    const channelSub = supabase
      .channel(`chat-mobile:${activeChanId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${activeChanId}`,
        },
        async (payload) => {
          const { data: prof } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', payload.new.user_id)
            .single();

          const fullMsg = {
            ...payload.new,
            profiles: prof || undefined,
            message_reactions: [],
            attachments: [],
          };
          addMessage(activeChanId, fullMsg as any);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelSub);
    };
  }, [currentChannel, screen, addMessage, setMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [messages]);

  // ---------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      Alert.alert('Erro no Login', error.message);
    }
  };

  const handleSignup = async () => {
    if (!email || !password || !username) return;
    setLoading(true);
    
    // Create Auth User
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.trim().toLowerCase(),
        }
      }
    });

    if (authError) {
      setLoading(false);
      Alert.alert('Erro no Cadastro', authError.message);
      return;
    }

    // Auto-create user profile profile just in case trigger takes time
    if (authData?.user) {
      await supabase.from('profiles').insert({
        id: authData.user.id,
        username: username.trim().toLowerCase(),
        status: 'online',
      });
    }

    setLoading(false);
    Alert.alert('Sucesso', 'Conta criada! Faça o login.');
    setScreen('login');
  };

  const handleCreateCommunity = async () => {
    if (!newCommunityName.trim() || !profile) return;
    setLoading(true);
    try {
      const { data: community, error: commError } = await supabase
        .from('communities')
        .insert({ name: newCommunityName.trim(), owner_id: profile.id })
        .select()
        .single();

      if (commError) throw commError;

      if (community) {
        await supabase.from('channels').insert([
          { community_id: community.id, name: 'geral', type: 'text', position: 0 },
          { community_id: community.id, name: 'Geral (Voz)', type: 'voice', position: 1 },
        ]);
      }

      setNewCommunityName('');
      setShowCreateCommunityModal(false);
      await loadCommunities();
      setScreen('main');
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCommunity = async () => {
    if (!inviteCode.trim() || !profile) return;
    setLoading(true);
    try {
      const { data: invite, error: inviteError } = await supabase
        .from('invitations')
        .select('*')
        .eq('code', inviteCode.trim())
        .single();

      if (inviteError || !invite) throw new Error('Código de convite inválido ou expirado.');

      const { error: memberError } = await supabase
        .from('community_members')
        .insert({ community_id: invite.community_id, user_id: profile.id });

      if (memberError) {
        if (memberError.code === '23505') throw new Error('Você já faz parte desta comunidade.');
        throw memberError;
      }

      await loadCommunities();
      setShowJoinCommunityModal(false);
      setInviteCode('');
      setScreen('main');
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;
    setLoading(true);
    try {
      const name = newChannelType === 'text'
        ? newChannelName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '')
        : newChannelName.trim();

      await createChannel(name, newChannelType);
      setShowCreateChannelModal(false);
      setNewChannelName('');
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !profile || !currentChannel) return;
    const textToSend = inputText.trim();
    setInputText('');

    try {
      const messageBody: any = {
        channel_id: currentChannel.id,
        user_id: profile.id,
        content: textToSend,
      };

      if (replyingToMessage) {
        messageBody.reply_to = replyingToMessage.id;
        setReplyingToMessage(null);
      }

      const { error } = await supabase.from('messages').insert(messageBody);
      if (error) throw error;
    } catch (err: any) {
      Alert.alert('Erro ao enviar', err.message);
    }
  };

  const handleConnectVoice = async () => {
    if (!profile || !currentChannel) return;
    setLoading(true);
    try {
      const response = await fetch('https://yrdefuosydjjjnqvvrke.supabase.co/functions/v1/livekit-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelId: currentChannel.id,
          username: profile.display_name || profile.username,
        }),
      });
      const data = await response.json();
      if (data.token) {
        setLiveKitToken(data.token);
        setInCall(true);
      } else {
        Alert.alert('Erro', 'Não foi possível conectar ao servidor de voz.');
      }
    } catch (err) {
      console.error(err);
      // Fallback local call simulation in case Edge Function is not deployed
      setInCall(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectVoice = () => {
    setInCall(false);
    setLiveKitToken(null);
  };

  const handleLogout = async () => {
    await signOut();
    setScreen('login');
  };

  // ---------------------------------------------------------
  // RENDER SCREENS
  // ---------------------------------------------------------

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Carregando Zyro...</Text>
      </View>
    );
  }

  if (screen === 'login') {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar style="light" />
        <View style={styles.authBox}>
          <Text style={styles.logoText}>zyro</Text>
          <Text style={styles.subtext}>Acesse sua plataforma privada de comunicação</Text>

          <InputField
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="seu@email.com"
            keyboardType="email-address"
          />
          <InputField
            label="Senha"
            value={password}
            onChangeText={setPassword}
            placeholder="Sua senha secreta"
            secureTextEntry
          />

          <Button title="Entrar" onPress={handleLogin} loading={loading} />

          <TouchableOpacity onPress={() => setScreen('signup')}>
            <Text style={styles.linkText}>Não tem uma conta? Crie uma conta</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (screen === 'signup') {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar style="light" />
        <View style={styles.authBox}>
          <Text style={styles.logoText}>zyro</Text>
          <Text style={styles.subtext}>Crie sua conta no Zyro</Text>

          <InputField
            label="Nome de Usuário"
            value={username}
            onChangeText={setUsername}
            placeholder="username"
          />
          <InputField
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="seu@email.com"
            keyboardType="email-address"
          />
          <InputField
            label="Senha"
            value={password}
            onChangeText={setPassword}
            placeholder="Mínimo 6 caracteres"
            secureTextEntry
          />

          <Button title="Cadastrar" onPress={handleSignup} loading={loading} />

          <TouchableOpacity onPress={() => setScreen('login')}>
            <Text style={styles.linkText}>Já tem uma conta? Faça Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (screen === 'onboarding') {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar style="light" />
        <View style={styles.onboardingBox}>
          <Text style={styles.logoText}>Olá 👋</Text>
          <Text style={styles.subtext}>Você não está conectado a nenhuma comunidade privada.</Text>

          {!showCreateCommunityModal && !showJoinCommunityModal ? (
            <View style={styles.onboardingActions}>
              <TouchableOpacity
                style={styles.onboardingCard}
                onPress={() => setShowCreateCommunityModal(true)}
              >
                <Text style={styles.cardEmoji}>✨</Text>
                <Text style={styles.cardTitle}>Criar Comunidade</Text>
                <Text style={styles.cardDesc}>Crie seu espaço exclusivo e chame seus amigos.</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.onboardingCard}
                onPress={() => setShowJoinCommunityModal(true)}
              >
                <Text style={styles.cardEmoji}>🔑</Text>
                <Text style={styles.cardTitle}>Entrar com Código</Text>
                <Text style={styles.cardDesc}>Use um código recebido de convite.</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <LogOut size={16} color="#ef4444" />
                <Text style={styles.logoutBtnText}>Fazer Logout</Text>
              </TouchableOpacity>
            </View>
          ) : showCreateCommunityModal ? (
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Criar Comunidade</Text>
              <InputField
                label="Nome da Comunidade"
                value={newCommunityName}
                onChangeText={setNewCommunityName}
                placeholder="ex: Meu Espaço de Jogos"
              />
              <Button title="Criar" onPress={handleCreateCommunity} loading={loading} />
              <TouchableOpacity onPress={() => setShowCreateCommunityModal(false)}>
                <Text style={styles.cancelText}>Voltar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Entrar com Código</Text>
              <InputField
                label="Código do Convite"
                value={inviteCode}
                onChangeText={setInviteCode}
                placeholder="ex: INV-W3XYZ"
              />
              <Button title="Entrar" onPress={handleJoinCommunity} loading={loading} />
              <TouchableOpacity onPress={() => setShowJoinCommunityModal(false)}>
                <Text style={styles.cancelText}>Voltar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------
  // MAIN DASHBOARD (CHAT / VOICE CHANNELS)
  // ---------------------------------------------------------
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSidebarOpen(!sidebarOpen)}>
            <Menu size={24} color="#e4e4e7" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            {currentChannel?.type === 'text' ? (
              <Hash size={18} color="#a1a1aa" style={{ marginRight: 4 }} />
            ) : (
              <Volume2 size={18} color="#a1a1aa" style={{ marginRight: 4 }} />
            )}
            <Text style={styles.headerTitle}>
              {currentChannel ? currentChannel.name : 'Selecionar Canal'}
            </Text>
          </View>
          <View style={{ width: 24 }} /> {/* Balance Menu Button */}
        </View>

        <View style={styles.mainLayout}>
          {/* SIDEBAR GAVETA (LEFT) */}
          {sidebarOpen && (
            <View style={styles.sidebar}>
              {/* Community Selector Header */}
              <TouchableOpacity
                style={styles.sidebarCommunityHeader}
                onPress={() => setShowCommunityList(!showCommunityList)}
              >
                <View style={styles.communityIcon}>
                  <Text style={styles.communityIconText}>
                    {currentCommunity ? currentCommunity.name.substring(0, 2).toUpperCase() : 'Z'}
                  </Text>
                </View>
                <Text style={styles.sidebarCommunityName} numberOfLines={1}>
                  {currentCommunity ? currentCommunity.name : 'Escolher Comunidade'}
                </Text>
                <ChevronDown size={14} color="#a1a1aa" />
              </TouchableOpacity>

              {/* Community List Dropdown */}
              {showCommunityList && (
                <View style={styles.communityDropdown}>
                  {communities.map((comm) => (
                    <TouchableOpacity
                      key={comm.id}
                      style={styles.communityDropdownItem}
                      onPress={() => {
                        setCurrentCommunity(comm);
                        setShowCommunityList(false);
                      }}
                    >
                      <Text style={styles.communityDropdownText}>{comm.name}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={styles.communityDropdownAdd}
                    onPress={() => {
                      setScreen('onboarding');
                      setSidebarOpen(false);
                    }}
                  >
                    <Plus size={14} color="#10b981" />
                    <Text style={styles.communityDropdownAddText}>Nova Comunidade</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Channels List */}
              <ScrollView style={styles.sidebarChannelsList}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>CANAIS DE TEXTO</Text>
                  {currentCommunity?.owner_id === profile?.id && (
                    <TouchableOpacity onPress={() => {
                      setNewChannelType('text');
                      setShowCreateChannelModal(true);
                    }}>
                      <Plus size={14} color="#a1a1aa" />
                    </TouchableOpacity>
                  )}
                </View>
                {channels
                  .filter((c) => c.type === 'text')
                  .map((chan) => (
                    <TouchableOpacity
                      key={chan.id}
                      style={[
                        styles.channelItem,
                        currentChannel?.id === chan.id && styles.channelItemActive,
                      ]}
                      onPress={() => {
                        setCurrentChannel(chan);
                        setSidebarOpen(false);
                      }}
                    >
                      <Hash size={14} color={currentChannel?.id === chan.id ? '#6366f1' : '#71717a'} style={{ marginRight: 6 }} />
                      <Text
                        style={[
                          styles.channelItemText,
                          currentChannel?.id === chan.id && styles.channelItemTextActive,
                        ]}
                      >
                        {chan.name}
                      </Text>
                    </TouchableOpacity>
                  ))}

                <View style={[styles.sectionHeader, { marginTop: 20 }]}>
                  <Text style={styles.sectionTitle}>CANAIS DE VOZ</Text>
                  {currentCommunity?.owner_id === profile?.id && (
                    <TouchableOpacity onPress={() => {
                      setNewChannelType('voice');
                      setShowCreateChannelModal(true);
                    }}>
                      <Plus size={14} color="#a1a1aa" />
                    </TouchableOpacity>
                  )}
                </View>
                {channels
                  .filter((c) => c.type === 'voice')
                  .map((chan) => (
                    <TouchableOpacity
                      key={chan.id}
                      style={[
                        styles.channelItem,
                        currentChannel?.id === chan.id && styles.channelItemActive,
                      ]}
                      onPress={() => {
                        setCurrentChannel(chan);
                        setSidebarOpen(false);
                      }}
                    >
                      <Volume2 size={14} color={currentChannel?.id === chan.id ? '#6366f1' : '#71717a'} style={{ marginRight: 6 }} />
                      <Text
                        style={[
                          styles.channelItemText,
                          currentChannel?.id === chan.id && styles.channelItemTextActive,
                        ]}
                      >
                        {chan.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>

              {/* User Profile Footer */}
              <View style={styles.sidebarFooter}>
                <View style={styles.userInfo}>
                  <Avatar name={profile?.display_name || profile?.username || 'U'} size={32} />
                  <View style={styles.userMeta}>
                    <Text style={styles.usernameText} numberOfLines={1}>
                      {profile?.display_name || profile?.username}
                    </Text>
                    <Text style={styles.userStatusText}>Online</Text>
                  </View>
                </View>
                <View style={styles.footerControls}>
                  <TouchableOpacity onPress={() => setMuted(!muted)} style={styles.footerControlBtn}>
                    {muted ? <MicOff size={16} color="#ef4444" /> : <Mic size={16} color="#a1a1aa" />}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setDeafened(!deafened)} style={styles.footerControlBtn}>
                    <Headphones size={16} color={deafened ? '#ef4444' : '#a1a1aa'} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleLogout} style={styles.footerControlBtn}>
                    <LogOut size={16} color="#f43f5e" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* ACTIVE CALL BAR (Voice channel active) */}
          {inCall && (
            <View style={styles.activeCallBar}>
              <View style={styles.callBarInfo}>
                <View style={styles.callLiveDot} />
                <Text style={styles.callBarText}>Voz conectada: {currentChannel?.name}</Text>
              </View>
              <TouchableOpacity style={styles.callBarDisconnect} onPress={handleDisconnectVoice}>
                <PhoneOff size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* CHAT/VOICE PAGE BODY */}
          <View style={styles.body}>
            {currentChannel?.type === 'voice' ? (
              // VOICE CHANNEL SCREEN
              <View style={styles.voicePanel}>
                <Volume2 size={64} color="#3f3f46" style={styles.voiceIconBig} />
                <Text style={styles.voiceChannelTitle}>{currentChannel.name}</Text>
                <Text style={styles.voiceChannelDesc}>
                  Conecte-se para conversar por voz de forma privada e segura.
                </Text>
                {!inCall ? (
                  <TouchableOpacity style={styles.voiceConnectBtn} onPress={handleConnectVoice}>
                    <Text style={styles.voiceConnectBtnText}>Entrar no canal de voz</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.voiceConnectedBox}>
                    <Text style={styles.voiceConnectedStatus}>Você está conectado no canal</Text>
                    <TouchableOpacity style={styles.voiceDisconnectBtn} onPress={handleDisconnectVoice}>
                      <Text style={styles.voiceDisconnectBtnText}>Desconectar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              // TEXT CHANNEL SCREEN (CHAT)
              <View style={styles.chatContainer}>
                {messages.length === 0 ? (
                  <View style={styles.emptyChatBox}>
                    <Hash size={48} color="#27272a" />
                    <Text style={styles.emptyChatTitle}>Este é o início do canal #{currentChannel?.name}</Text>
                    <Text style={styles.emptyChatDesc}>Comece a conversa enviando uma mensagem!</Text>
                  </View>
                ) : (
                  <FlatList
                    ref={listRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => {
                      const author = item.profiles?.display_name || item.profiles?.username || 'Usuário';
                      const isReply = item.reply_to;
                      const repliedMsg = isReply ? messages.find((m) => m.id === item.reply_to) : null;
                      return (
                        <View style={styles.messageBox}>
                          {repliedMsg && (
                            <View style={styles.replyQuote}>
                              <CornerUpLeft size={10} color="#71717a" style={{ marginRight: 4 }} />
                              <Text style={styles.replyQuoteAuthor}>
                                @{repliedMsg.profiles?.display_name || repliedMsg.profiles?.username || 'Usuário'}
                              </Text>
                              <Text style={styles.replyQuoteText} numberOfLines={1}>
                                {repliedMsg.content}
                              </Text>
                            </View>
                          )}
                          <View style={styles.messageRow}>
                            <Avatar name={author} size={36} />
                            <View style={styles.messageContent}>
                              <View style={styles.messageMeta}>
                                <Text style={styles.messageAuthor}>{author}</Text>
                                <Text style={styles.messageTime}>
                                  {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                              </View>
                              <Text style={styles.messageText}>{item.content}</Text>
                            </View>
                            <TouchableOpacity
                              style={styles.messageReplyAction}
                              onPress={() => setReplyingToMessage(item)}
                            >
                              <CornerUpLeft size={14} color="#71717a" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    }}
                    contentContainerStyle={{ paddingVertical: 16 }}
                  />
                )}

                {/* REPLY BANNER */}
                {replyingToMessage && (
                  <View style={styles.replyBanner}>
                    <Text style={styles.replyBannerText} numberOfLines={1}>
                      Respondendo a{' '}
                      <Text style={{ fontWeight: 'bold' }}>
                        @{replyingToMessage.profiles?.display_name || replyingToMessage.profiles?.username}
                      </Text>
                    </Text>
                    <TouchableOpacity onPress={() => setReplyingToMessage(null)}>
                      <X size={14} color="#a1a1aa" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* CHAT INPUT BAR */}
                <View style={styles.inputBar}>
                  <TouchableOpacity style={styles.inputAttachBtn}>
                    <Paperclip size={18} color="#a1a1aa" />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.chatInput}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder={`Conversar em #${currentChannel?.name}`}
                    placeholderTextColor="#52525b"
                  />
                  <TouchableOpacity
                    style={[styles.inputSendBtn, !inputText.trim() && styles.inputSendBtnDisabled]}
                    onPress={handleSendMessage}
                    disabled={!inputText.trim()}
                  >
                    <Send size={18} color={inputText.trim() ? '#6366f1' : '#52525b'} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* CREATE CHANNEL DIALOG */}
        {showCreateChannelModal && (
          <View style={styles.nativeModalOverlay}>
            <View style={styles.nativeModal}>
              <Text style={styles.nativeModalTitle}>Criar Canal</Text>
              <InputField
                label="Nome do Canal"
                value={newChannelName}
                onChangeText={setNewChannelName}
                placeholder="ex: dicas-gerais"
              />
              <View style={styles.modalRadioContainer}>
                <TouchableOpacity
                  style={[styles.modalRadioOption, newChannelType === 'text' && styles.modalRadioActive]}
                  onPress={() => setNewChannelType('text')}
                >
                  <Text style={styles.modalRadioText}>Canal de Texto</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalRadioOption, newChannelType === 'voice' && styles.modalRadioActive]}
                  onPress={() => setNewChannelType('voice')}
                >
                  <Text style={styles.modalRadioText}>Canal de Voz</Text>
                </TouchableOpacity>
              </View>
              <Button title="Criar Canal" onPress={handleCreateChannel} />
              <TouchableOpacity
                style={{ marginTop: 10, alignSelf: 'center' }}
                onPress={() => setShowCreateChannelModal(false)}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------
// STYLES
// ---------------------------------------------------------

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#09090b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#a1a1aa',
    fontSize: 14,
    fontWeight: '500',
  },
  authContainer: {
    flex: 1,
    backgroundColor: '#09090b',
    justifyContent: 'center',
    padding: 24,
  },
  authBox: {
    backgroundColor: '#18181b',
    borderColor: '#27272a',
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#818cf8',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 14,
    color: '#a1a1aa',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#71717a',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#09090b',
    borderColor: '#27272a',
    borderWidth: 1,
    borderRadius: 8,
    color: '#f4f4f5',
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
  },
  btn: {
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  btnPrimary: {
    backgroundColor: '#4f46e5',
  },
  btnSecondary: {
    backgroundColor: '#27272a',
  },
  btnDanger: {
    backgroundColor: '#ef4444',
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  btnTextWhite: {
    color: '#fff',
  },
  btnTextDark: {
    color: '#e4e4e7',
  },
  linkText: {
    color: '#818cf8',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
  },
  onboardingBox: {
    backgroundColor: '#18181b',
    borderColor: '#27272a',
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  onboardingActions: {
    width: '100%',
    marginTop: 16,
  },
  onboardingCard: {
    backgroundColor: '#09090b',
    borderColor: '#27272a',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f4f4f5',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: '#71717a',
    lineHeight: 16,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 12,
  },
  logoutBtnText: {
    color: '#ef4444',
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '600',
  },
  modalBox: {
    width: '100%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  cancelText: {
    color: '#a1a1aa',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '500',
    padding: 8,
  },
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  header: {
    height: 56,
    backgroundColor: '#18181b',
    borderBottomColor: '#27272a',
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'between',
    paddingHorizontal: 16,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f4f4f5',
  },
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: '75%',
    height: '100%',
    backgroundColor: '#18181b',
    borderRightColor: '#27272a',
    borderRightWidth: 1,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 999,
  },
  sidebarCommunityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomColor: '#27272a',
    borderBottomWidth: 1,
  },
  communityIcon: {
    width: 28,
    height: 28,
    backgroundColor: '#312e81',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  communityIconText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  sidebarCommunityName: {
    flex: 1,
    color: '#f4f4f5',
    fontWeight: '700',
    fontSize: 14,
  },
  communityDropdown: {
    backgroundColor: '#09090b',
    borderColor: '#27272a',
    borderBottomWidth: 1,
    padding: 8,
  },
  communityDropdownItem: {
    padding: 10,
    borderRadius: 6,
  },
  communityDropdownText: {
    color: '#e4e4e7',
    fontSize: 13,
  },
  communityDropdownAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopColor: '#18181b',
    borderTopWidth: 1,
    marginTop: 4,
  },
  communityDropdownAddText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  sidebarChannelsList: {
    flex: 1,
    padding: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#71717a',
    letterSpacing: 1,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'between',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 2,
  },
  channelItemActive: {
    backgroundColor: '#27272a',
  },
  channelItemText: {
    color: '#a1a1aa',
    fontSize: 13,
  },
  channelItemTextActive: {
    color: '#818cf8',
    fontWeight: '600',
  },
  sidebarFooter: {
    height: 56,
    backgroundColor: '#09090b',
    borderTopColor: '#27272a',
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'between',
    paddingHorizontal: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  avatar: {
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#a1a1aa',
    fontWeight: '700',
    fontSize: 12,
  },
  userMeta: {
    marginLeft: 8,
    flex: 1,
  },
  usernameText: {
    color: '#e4e4e7',
    fontSize: 12,
    fontWeight: '700',
  },
  userStatusText: {
    color: '#10b981',
    fontSize: 9,
    fontWeight: '500',
  },
  footerControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerControlBtn: {
    padding: 6,
    borderRadius: 6,
    marginLeft: 2,
  },
  activeCallBar: {
    height: 40,
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'between',
    paddingHorizontal: 16,
  },
  callBarInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    marginRight: 6,
  },
  callBarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  callBarDisconnect: {
    padding: 6,
  },
  body: {
    flex: 1,
  },
  voicePanel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  voiceIconBig: {
    marginBottom: 16,
  },
  voiceChannelTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e4e4e7',
    marginBottom: 8,
  },
  voiceChannelDesc: {
    color: '#71717a',
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 24,
  },
  voiceConnectBtn: {
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  voiceConnectBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  voiceConnectedBox: {
    alignItems: 'center',
  },
  voiceConnectedStatus: {
    color: '#10b981',
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 12,
  },
  voiceDisconnectBtn: {
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  voiceDisconnectBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  chatContainer: {
    flex: 1,
    justifyContent: 'between',
  },
  emptyChatBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyChatTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#a1a1aa',
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyChatDesc: {
    fontSize: 12,
    color: '#52525b',
    textAlign: 'center',
  },
  messageBox: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'start',
  },
  messageContent: {
    marginLeft: 12,
    flex: 1,
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  messageAuthor: {
    color: '#e4e4e7',
    fontSize: 13,
    fontWeight: '700',
    marginRight: 6,
  },
  messageTime: {
    color: '#52525b',
    fontSize: 9,
  },
  messageText: {
    color: '#d4d4d8',
    fontSize: 13,
    lineHeight: 18,
  },
  messageReplyAction: {
    padding: 6,
    alignSelf: 'center',
  },
  replyQuote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 48,
    marginBottom: 4,
    opacity: 0.7,
  },
  replyQuoteAuthor: {
    color: '#a1a1aa',
    fontSize: 11,
    fontWeight: '600',
    marginRight: 4,
  },
  replyQuoteText: {
    color: '#71717a',
    fontSize: 11,
    fontStyle: 'italic',
    flex: 1,
  },
  replyBanner: {
    height: 36,
    backgroundColor: '#18181b',
    borderTopColor: '#27272a',
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'between',
    paddingHorizontal: 16,
  },
  replyBannerText: {
    color: '#a1a1aa',
    fontSize: 12,
    flex: 1,
  },
  inputBar: {
    height: 56,
    backgroundColor: '#18181b',
    borderTopColor: '#27272a',
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  inputAttachBtn: {
    padding: 8,
  },
  chatInput: {
    flex: 1,
    color: '#f4f4f5',
    paddingHorizontal: 12,
    fontSize: 14,
    height: 40,
  },
  inputSendBtn: {
    padding: 8,
  },
  inputSendBtnDisabled: {
    opacity: 0.4,
  },
  nativeModalOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 24,
    zIndex: 9999,
  },
  nativeModal: {
    backgroundColor: '#18181b',
    borderColor: '#27272a',
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
  },
  nativeModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  modalRadioContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  modalRadioOption: {
    flex: 1,
    height: 40,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRadioActive: {
    borderColor: '#6366f1',
    backgroundColor: 'rgba(99,102,241,0.1)',
  },
  modalRadioText: {
    color: '#e4e4e7',
    fontSize: 12,
    fontWeight: '600',
  },
});
