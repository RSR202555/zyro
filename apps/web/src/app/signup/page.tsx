"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@zyro/shared";
import { Button, Input } from "@zyro/ui";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.toLowerCase().replace(/[^a-z0-9_]/g, "").trim(),
          display_name: displayName.trim() || username.trim(),
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md rounded-xl bg-zinc-900 border border-zinc-800 p-8 shadow-2xl flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3">
          <img src="/logozyro.png" alt="Zyro Logo" className="h-16 w-auto object-contain select-none" />
          <p className="text-sm text-zinc-400 text-center">
            Cadastre-se na plataforma privada do Zyro.
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-950/50 border border-red-800 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {success ? (
          <div className="flex flex-col gap-4 text-center">
            <div className="rounded-lg bg-emerald-950/50 border border-emerald-800 p-4 text-sm text-emerald-450">
              Conta criada com sucesso! Se a confirmação de e-mail estiver habilitada, verifique sua caixa de entrada. Caso contrário, você já pode fazer login.
            </div>
            <Button variant="primary" onClick={() => router.push("/login")}>
              Ir para o Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <Input
              label="Nome de Usuário (apenas letras, números e _)"
              type="text"
              placeholder="ex: joaosilva"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
            />
            <Input
              label="Nome de Exibição"
              type="text"
              placeholder="ex: João Silva"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={loading}
            />
            <Input
              label="E-mail"
              type="email"
              placeholder="nome@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
            <Input
              label="Senha"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
            <Button type="submit" variant="primary" size="lg" className="w-full mt-2" disabled={loading}>
              {loading ? "Cadastrando..." : "Criar Conta"}
            </Button>
          </form>
        )}

        {!success && (
          <p className="text-xs text-center text-zinc-500">
            Já tem uma conta?{" "}
            <Link href="/login" className="text-indigo-400 hover:underline">
              Fazer login
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
