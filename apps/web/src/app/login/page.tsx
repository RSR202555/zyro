"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@zyro/shared";
import { Button, Input } from "@zyro/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : signInError.message);
      setLoading(false);
    } else {
      router.push("/");
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md rounded-xl bg-zinc-900 border border-zinc-800 p-8 shadow-2xl flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3">
          <img src="/logozyro.png" alt="Zyro Logo" className="h-16 w-auto object-contain select-none" />
          <p className="text-sm text-zinc-400 text-center">
            Bem-vindo de volta! Entre na sua conta privada.
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-950/50 border border-red-800 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
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
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
          <Button type="submit" variant="primary" size="lg" className="w-full mt-2 animate-pulse" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className="text-xs text-center text-zinc-500">
          Não tem uma conta?{" "}
          <Link href="/signup" className="text-indigo-400 hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
