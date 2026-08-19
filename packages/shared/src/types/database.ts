export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  status: 'online' | 'idle' | 'do_not_disturb' | 'offline';
  custom_status?: string | null;
  profile_color?: string;
  created_at: string;
  updated_at: string;
}

export interface Community {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  owner_id: string | null;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  nickname: string | null;
  joined_at: string;
}

export interface Channel {
  id: string;
  community_id: string;
  parent_id: string | null;
  name: string;
  type: 'text' | 'voice' | 'category';
  position: number;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface Invitation {
  id: string;
  community_id: string;
  code: string;
  max_uses: number | null;
  uses: number;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  reply_to: string | null;
  edited_at: string | null;
  created_at: string;
  deleted_at: string | null;
  profiles?: Profile;
}

export interface Role {
  id: string;
  community_id: string;
  name: string;
  color: string | null;
  position: number;
  permissions: string[];
  created_at: string;
}

export interface MemberRole {
  member_id: string;
  role_id: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface Attachment {
  id: string;
  message_id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  created_at: string;
}
