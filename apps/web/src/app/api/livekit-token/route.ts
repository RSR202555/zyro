import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export async function POST(req: NextRequest) {
  try {
    const { channelId, username } = await req.json();

    if (!channelId || !username) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Credenciais do LiveKit não configuradas no servidor local (.env.local)" },
        { status: 500 }
      );
    }

    // Gerar token de participante do LiveKit
    const at = new AccessToken(apiKey, apiSecret, {
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

    return NextResponse.json({ token });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
