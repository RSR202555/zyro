-- RPC SECURITY DEFINER para criação de convites por qualquer membro da comunidade
CREATE OR REPLACE FUNCTION public.create_community_invite(p_community_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_code TEXT;
BEGIN
    -- Verificar se o usuário é membro ou dono da comunidade
    IF NOT EXISTS (
        SELECT 1 FROM public.community_members WHERE community_id = p_community_id AND user_id = auth.uid()
    ) AND NOT EXISTS (
        SELECT 1 FROM public.communities WHERE id = p_community_id AND owner_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Acesso negado: você não é membro desta comunidade.';
    END IF;

    -- Gerar código único ex: INV-ABC123
    v_code := 'INV-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));

    INSERT INTO public.invitations (community_id, code, created_by)
    VALUES (p_community_id, v_code, auth.uid());

    RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir permissão de execução para usuários autenticados
GRANT EXECUTE ON FUNCTION public.create_community_invite(UUID) TO authenticated;

-- Adicionar Política RLS para inserção de convites por membros
DROP POLICY IF EXISTS "Allow members to create invitations" ON public.invitations;
CREATE POLICY "Allow members to create invitations"
    ON public.invitations FOR INSERT
    WITH CHECK (
        public.is_community_member(community_id, auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.communities WHERE id = invitations.community_id AND owner_id = auth.uid()
        )
    );
