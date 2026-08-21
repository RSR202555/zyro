import type { Metadata } from "next";
import { AppInitializer } from "@/components/AppInitializer";
import "@livekit/components-styles";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zyro",
  description: "Plataforma Privada de Comunicação",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-zinc-950 text-zinc-100 select-none">
        <AppInitializer>
          {children}
        </AppInitializer>
      </body>
    </html>
  );
}
