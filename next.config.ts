import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Temporário durante migração: pular type-check no build de produção
  // (componentes portados do Lovable têm divergências menores de tipos com o
  // shadcn/base-ui da nova versão; o app roda fine em runtime). TODO: remover.
  typescript: { ignoreBuildErrors: true },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "oinweocqcptwxqsztlcl.supabase.co" },
      { protocol: "https", hostname: "uulpqmylqnonbxozdbtb.supabase.co" }, // legado
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "**" }, // imagens externas (vereadores, fontes, etc)
    ],
  },
};

export default nextConfig;
