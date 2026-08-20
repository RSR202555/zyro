-- Migration 20260818000004: Adicionar função RPC join_community_by_invite e ajustar políticas RLS em invitations

-- 1. Função RPC com SECURITY DEFINER para resgatar convite atomicamente e sem bloqueios de RLS no UPDATE de usos
CREATE OR REPLACE FUNCTION public.join_community_by_invite(p_code TEXT)
RETURNS UUID AS $$
DECLARE
    v_invite RECORD;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado.';
    END IF;

    IF p_code IS NULL OR TRIM(p_code) = '' THEN
        RAISE EXCEPTION 'Código de convite inválido.';
    END IF;

    -- Buscar convite de forma insensível a maiúsculas/minúsculas e sem espaços nas pontas
    SELECT * INTO v_invite
    FROM public.invitations
    WHERE LOWER(TRIM(code)) = LOWER(TRIM(p_code))
    LIMIT 1;

    IF v_invite IS NULL THEN
        RAISE EXCEPTION 'Convite inválido ou não encontrado.';
    END IF;

    -- Validar expiração
    IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < NOW() THEN
        RAISE EXCEPTION 'Este convite expirou.';
    END IF;

    -- Validar limite de usos
    IF v_invite.max_uses IS NOT NULL AND v_invite.max_uses > 0 AND v_invite.uses >= v_invite.max_uses THEN
        RAISE EXCEPTION 'Este convite atingiu o limite máximo de usos.';
    END IF;

    -- Verificar se o usuário já é membro da comunidade
    IF EXISTS (
        SELECT 1 FROM public.community_members
        WHERE community_id = v_invite.community_id AND user_id = v_user_id
    ) THEN
        -- Retorna o ID da comunidade diretamente se já for membro
        RETURN v_invite.community_id;
    END IF;

    -- Inserir membro na comunidade
    INSERT INTO public.community_members (community_id, user_id)
    VALUES (v_invite.community_id, v_user_id);

    -- Incrementar contagem de usos do convite
    UPDATE public.invitations
    SET uses = uses + 1
    WHERE id = v_invite.id;

    RETURN v_invite.community_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissão de execução para usuários autenticados
GRANT EXECUTE ON FUNCTION public.join_community_by_invite(TEXT) TO authenticated;

-- 2. Política RLS adicional em invitations para permitir UPDATE de 'uses' por usuários autenticados se usarem o cliente direto
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'invitations' AND policyname = 'Allow authenticated to increment invitation uses'
    ) THEN
        CREATE POLICY "Allow authenticated to increment invitation uses"
            ON public.invitations FOR UPDATE
            USING (auth.role() = 'authenticated')
            WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;
