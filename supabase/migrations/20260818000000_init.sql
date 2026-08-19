-- Zyro Schema Inicial (Fase 1: Fundação)

-- 1. Perfis de Usuário (Profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    status TEXT CHECK (status IN ('online', 'idle', 'do_not_disturb', 'offline')) DEFAULT 'offline' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS) para Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Comunidades (Communities)
CREATE TABLE IF NOT EXISTS public.communities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_private BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS) para Communities
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;

-- 3. Membros de Comunidades (Community Members)
CREATE TABLE IF NOT EXISTS public.community_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    nickname TEXT,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_community_member UNIQUE (community_id, user_id)
);

-- Habilitar Row Level Security (RLS) para Community Members
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

-- 4. Canais (Channels)
CREATE TABLE IF NOT EXISTS public.channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL,
    parent_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('text', 'voice', 'category')) NOT NULL,
    position INTEGER DEFAULT 0 NOT NULL,
    is_private BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS) para Channels
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

-- 5. Convites (Invitations)
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL,
    code TEXT UNIQUE NOT NULL,
    max_uses INTEGER,
    uses INTEGER DEFAULT 0 NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS) para Invitations
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- 6. Mensagens (Messages)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    reply_to UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    edited_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Habilitar Row Level Security (RLS) para Messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------
-- TRIGGERS E FUNÇÕES AUXILIARES
-- ----------------------------------------------------

-- Função SECURITY DEFINER para verificar membresia de forma segura (evita recursão de RLS)
CREATE OR REPLACE FUNCTION public.is_community_member(community_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.community_members
        WHERE community_members.community_id = $1
        AND community_members.user_id = $2
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Trigger para autocriação de Perfil no cadastro (auth.users)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_username TEXT;
BEGIN
    default_username := COALESCE(
        new.raw_user_meta_data->>'username',
        SPLIT_PART(new.email, '@', 1)
    );
    
    -- Garantir que username seja único adicionando números aleatórios se já existir
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = default_username) LOOP
        default_username := default_username || FLOOR(RANDOM() * 10)::TEXT;
    END LOOP;

    INSERT INTO public.profiles (id, username, display_name, avatar_url, status)
    VALUES (
        new.id,
        default_username,
        COALESCE(new.raw_user_meta_data->>'display_name', SPLIT_PART(new.email, '@', 1)),
        new.raw_user_meta_data->>'avatar_url',
        'offline'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- Trigger para adicionar o proprietário como membro ao criar uma comunidade
CREATE OR REPLACE FUNCTION public.handle_new_community()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.community_members (community_id, user_id)
    VALUES (new.id, new.owner_id);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_community_created
    AFTER INSERT ON public.communities
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_community();


-- ----------------------------------------------------
-- POLÍTICAS DE RLS (ROW LEVEL SECURITY)
-- ----------------------------------------------------

-- Políticas para Profiles
CREATE POLICY "Allow authenticated read profiles" 
    ON public.profiles FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow users to update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Políticas para Communities
CREATE POLICY "Allow members to view communities" 
    ON public.communities FOR SELECT 
    USING (public.is_community_member(id, auth.uid()) OR owner_id = auth.uid());

CREATE POLICY "Allow authenticated users to create communities" 
    ON public.communities FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow owners to update community" 
    ON public.communities FOR UPDATE 
    USING (owner_id = auth.uid());

CREATE POLICY "Allow owners to delete community" 
    ON public.communities FOR DELETE 
    USING (owner_id = auth.uid());

-- Políticas para Community Members
CREATE POLICY "Allow members to view other members" 
    ON public.community_members FOR SELECT 
    USING (public.is_community_member(community_id, auth.uid()));

CREATE POLICY "Allow users to join (create membership)" 
    ON public.community_members FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow members to leave or owner to kick" 
    ON public.community_members FOR DELETE 
    USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.communities 
            WHERE communities.id = community_members.community_id 
            AND communities.owner_id = auth.uid()
        )
    );

-- Políticas para Channels
CREATE POLICY "Allow members to view channels" 
    ON public.channels FOR SELECT 
    USING (public.is_community_member(community_id, auth.uid()));

CREATE POLICY "Allow owners to manage channels" 
    ON public.channels FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.communities 
            WHERE communities.id = channels.community_id 
            AND communities.owner_id = auth.uid()
        )
    );

-- Políticas para Invitations
CREATE POLICY "Allow authenticated read invitations" 
    ON public.invitations FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow owners to manage invitations" 
    ON public.invitations FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.communities 
            WHERE communities.id = invitations.community_id 
            AND communities.owner_id = auth.uid()
        )
    );

-- Políticas para Messages
CREATE POLICY "Allow members to read messages" 
    ON public.messages FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.channels 
            WHERE channels.id = messages.channel_id 
            AND public.is_community_member(channels.community_id, auth.uid())
        )
    );

CREATE POLICY "Allow members to send messages" 
    ON public.messages FOR INSERT 
    WITH CHECK (
        auth.uid() = user_id 
        AND EXISTS (
            SELECT 1 FROM public.channels 
            WHERE channels.id = messages.channel_id 
            AND public.is_community_member(channels.community_id, auth.uid())
        )
    );

CREATE POLICY "Allow sender to update message" 
    ON public.messages FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Allow sender or owner to delete message" 
    ON public.messages FOR DELETE 
    USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.channels 
            JOIN public.communities ON communities.id = channels.community_id 
            WHERE channels.id = messages.channel_id 
            AND communities.owner_id = auth.uid()
        )
    );
