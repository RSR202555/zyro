import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.8";
import { AccessToken } from "npm:livekit-server-sdk@1.2.7";

const LIVEKIT_API_KEY = Deno.env.get("LIVEKIT_API_KEY") || "devkey";
const LIVEKIT_API_SECRET = Deno.env.get("LIVEKIT_API_SECRET") || "secret";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Tratar preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Header de autorização ausente" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { channelId, username } = await req.json();
    if (!channelId || !username) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Criar cliente Supabase com a credencial do usuário para validação RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Obter usuário logado a partir do token JWT enviado
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar canal para verificar a comunidade dele
    const { data: channel, error: channelError } = await supabaseClient
      .from("channels")
      .select("community_id")
      .eq("id", channelId)
      .single();

    if (channelError || !channel) {
      return new Response(JSON.stringify({ error: "Canal não encontrado ou acesso restrito" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar se o usuário pertence à comunidade do canal
    const { data: member, error: memberError } = await supabaseClient
      .from("community_members")
      .select("id")
      .eq("community_id", channel.community_id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !member) {
      return new Response(JSON.stringify({ error: "Você não possui permissão para acessar esta comunidade" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gerar token de acesso do LiveKit
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: username,
    });

    at.addGrant({
      roomJoin: true,
      room: channelId,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    return new Response(JSON.stringify({ token }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
