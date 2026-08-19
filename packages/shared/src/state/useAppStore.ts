import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { Profile, Community, Channel, Message } from '../types/database';

interface AppState {
  session: any | null;
  profile: Profile | null;
  communities: Community[];
  channels: Channel[];
  currentCommunity: Community | null;
  currentChannel: Channel | null;
  messages: Record<string, Message[]>;
  isLoading: boolean;
  
  setSession: (session: any | null) => void;
  setProfile: (profile: Profile | null) => void;
  setCommunities: (communities: Community[]) => void;
  setChannels: (channels: Channel[]) => void;
  setCurrentCommunity: (community: Community | null) => void;
  setCurrentChannel: (channel: Channel | null) => void;
  addMessage: (channelId: string, message: Message) => void;
  updateMessageInState: (channelId: string, message: Message) => void;
  deleteMessageFromState: (channelId: string, messageId: string) => void;
  setMessages: (channelId: string, messages: Message[]) => void;
  setLoading: (isLoading: boolean) => void;
  
  initializeAuth: () => Promise<void>;
  loadCommunities: () => Promise<void>;
  loadChannels: (communityId: string) => Promise<void>;
  updateProfileStatus: (status: Profile['status']) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  signOut: () => Promise<void>;
  createChannel: (name: string, type: 'text' | 'voice') => Promise<void>;
  deleteChannel: (channelId: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  session: null,
  profile: null,
  communities: [],
  channels: [],
  currentCommunity: null,
  currentChannel: null,
  messages: {},
  isLoading: true,

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setCommunities: (communities) => set({ communities }),
  setChannels: (channels) => set({ channels }),
  setCurrentCommunity: (currentCommunity) => {
    set({ currentCommunity, currentChannel: null });
    if (currentCommunity) {
      get().loadChannels(currentCommunity.id);
    }
  },
  setCurrentChannel: (currentChannel) => set({ currentChannel }),
  setLoading: (isLoading) => set({ isLoading }),

  addMessage: (channelId, message) => {
    const channelMessages = get().messages[channelId] || [];
    if (channelMessages.some((m) => m.id === message.id)) return;
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: [...channelMessages, message],
      },
    }));
  },

  updateMessageInState: (channelId, message) => {
    const channelMessages = get().messages[channelId] || [];
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: channelMessages.map((m) => m.id === message.id ? { ...m, ...message } : m),
      },
    }));
  },

  deleteMessageFromState: (channelId, messageId) => {
    const channelMessages = get().messages[channelId] || [];
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: channelMessages.filter((m) => m.id !== messageId),
      },
    }));
  },

  setMessages: (channelId, messages) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: messages,
      },
    }));
  },

  createChannel: async (name, type) => {
    const { currentCommunity } = get();
    if (!currentCommunity) return;
    const { error } = await supabase.from('channels').insert({
      community_id: currentCommunity.id,
      name,
      type,
      position: get().channels.length,
    });
    if (!error) {
      await get().loadChannels(currentCommunity.id);
    }
  },

  deleteChannel: async (channelId) => {
    const { currentCommunity, currentChannel } = get();
    if (!currentCommunity) return;
    const { error } = await supabase.from('channels').delete().eq('id', channelId);
    if (!error) {
      await get().loadChannels(currentCommunity.id);
      if (currentChannel?.id === channelId) {
        set({ currentChannel: null });
      }
    }
  },

  initializeAuth: async () => {
    set({ isLoading: true });
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({ session });

      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          set({ profile });
          await get().updateProfileStatus('online');
          await get().loadCommunities();
        }
      }
    } catch (err) {
      console.error("Erro ao inicializar autenticação:", err);
    } finally {
      set({ isLoading: false });
    }

    supabase.auth.onAuthStateChange(async (event, newSession) => {
      set({ session: newSession });
      if (newSession?.user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newSession.user.id)
            .single();
          if (profile) {
            set({ profile });
            await get().loadCommunities();
          }
        } catch (err) {
          console.error("Erro ao carregar perfil na mudança de auth:", err);
        }
      } else {
        set({ profile: null, communities: [], channels: [], currentCommunity: null, currentChannel: null });
      }
    });
  },

  loadCommunities: async () => {
    const { profile } = get();
    if (!profile) return;

    const { data: memberships } = await supabase
      .from('community_members')
      .select('community_id')
      .eq('user_id', profile.id);

    if (!memberships || memberships.length === 0) {
      set({ communities: [], currentCommunity: null });
      return;
    }

    const communityIds = memberships.map((m) => m.community_id);
    const { data: communities } = await supabase
      .from('communities')
      .select('*')
      .in('id', communityIds);

    if (communities) {
      set({ communities });
      if (!get().currentCommunity && communities.length > 0) {
        get().setCurrentCommunity(communities[0]);
      }
    }
  },

  loadChannels: async (communityId) => {
    const { data: channels } = await supabase
      .from('channels')
      .select('*')
      .eq('community_id', communityId)
      .order('position', { ascending: true });

    if (channels) {
      set({ channels });
      const textChannels = channels.filter((c) => c.type === 'text');
      if (textChannels.length > 0) {
        get().setCurrentChannel(textChannels[0]);
      }
    }
  },

  updateProfileStatus: async (status) => {
    const { profile } = get();
    if (!profile) return;

    const { error } = await supabase
      .from('profiles')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', profile.id);

    if (!error) {
      set({ profile: { ...profile, status } });
    }
  },

  updateProfile: async (updates) => {
    const { profile } = get();
    if (!profile) return;

    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', profile.id);

    if (!error) {
      set({ profile: { ...profile, ...updates } });
    }
  },

  signOut: async () => {
    const { profile } = get();
    if (profile) {
      await get().updateProfileStatus('offline');
    }
    await supabase.auth.signOut();
    set({ session: null, profile: null, communities: [], channels: [], currentCommunity: null, currentChannel: null });
  }
}));
