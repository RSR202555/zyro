"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function JoinAliasPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params?.code as string) || "";

  useEffect(() => {
    if (code) {
      router.replace(`/invite/${code}`);
    } else {
      router.replace("/");
    }
  }, [code, router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-100">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
    </div>
  );
}
