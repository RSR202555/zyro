-- Zyro Schema - Fases 2 & 3 (Cargos, Reações, Anexos e Storage)

-- 1. Cargos (Roles)
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    color TEXT,
    position INTEGER DEFAULT 0 NOT NULL,
    permissions TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS para Roles
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Políticas para Roles
CREATE POLICY "Allow members to read roles" 
    ON public.roles FOR SELECT 
    USING (public.is_community_member(community_id, auth.uid()));

CREATE POLICY "Allow owners to manage roles" 
    ON public.roles FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.communities 
            WHERE communities.id = roles.community_id 
            AND communities.owner_id = auth.uid()
        )
    );


-- 2. Associação de Cargos e Membros (Member Roles)
CREATE TABLE IF NOT EXISTS public.member_roles (
    member_id UUID REFERENCES public.community_members(id) ON DELETE CASCADE NOT NULL,
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (member_id, role_id)
);

-- Habilitar RLS para Member Roles
ALTER TABLE public.member_roles ENABLE ROW LEVEL SECURITY;

-- Políticas para Member Roles
CREATE POLICY "Allow members to read member roles" 
    ON public.member_roles FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.community_members AS cm 
            WHERE cm.id = member_id 
            AND public.is_community_member(cm.community_id, auth.uid())
        )
    );

CREATE POLICY "Allow owners to manage member roles" 
    ON public.member_roles FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.community_members AS cm 
            JOIN public.communities AS c ON c.id = cm.community_id 
            WHERE cm.id = member_id 
            AND c.owner_id = auth.uid()
        )
    );


-- 3. Reações de Mensagens (Message Reactions)
CREATE TABLE IF NOT EXISTS public.message_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    emoji TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_message_user_emoji UNIQUE (message_id, user_id, emoji)
);

-- Habilitar RLS para Message Reactions
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Políticas para Message Reactions
CREATE POLICY "Allow members to view message reactions" 
    ON public.message_reactions FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.messages AS m 
            JOIN public.channels AS ch ON ch.id = m.channel_id 
            WHERE m.id = message_id 
            AND public.is_community_member(ch.community_id, auth.uid())
        )
    );

CREATE POLICY "Allow members to add reaction" 
    ON public.message_reactions FOR INSERT 
    WITH CHECK (
        auth.uid() = user_id 
        AND EXISTS (
            SELECT 1 FROM public.messages AS m 
            JOIN public.channels AS ch ON ch.id = m.channel_id 
            WHERE m.id = message_id 
            AND public.is_community_member(ch.community_id, auth.uid())
        )
    );

CREATE POLICY "Allow users to remove reaction" 
    ON public.message_reactions FOR DELETE 
    USING (auth.uid() = user_id);


-- 4. Anexos de Mensagem (Attachments)
CREATE TABLE IF NOT EXISTS public.attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS para Attachments
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Políticas para Attachments
CREATE POLICY "Allow members to view attachments" 
    ON public.attachments FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.messages AS m 
            JOIN public.channels AS ch ON ch.id = m.channel_id 
            WHERE m.id = message_id 
            AND public.is_community_member(ch.community_id, auth.uid())
        )
    );

CREATE POLICY "Allow sender to insert attachments" 
    ON public.attachments FOR INSERT 
    WITH CHECK (auth.uid() = user_id);


-- 5. Configuração de Buckets de Armazenamento (Supabase Storage)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS de Storage para o bucket attachments
CREATE POLICY "Allow authenticated read storage" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert storage" 
    ON storage.objects FOR INSERT 
    WITH CHECK (bucket_id = 'attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Allow owners to delete storage" 
    ON storage.objects FOR DELETE 
    USING (bucket_id = 'attachments' AND auth.uid() = owner);
