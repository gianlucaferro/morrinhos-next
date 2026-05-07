"use client";

import dynamic from "next/dynamic";
import type { AnuncioDetalheClientProps } from "./AnuncioDetalheClient";

const AnuncioDetalheClient = dynamic<AnuncioDetalheClientProps>(() => import("./AnuncioDetalheClient"), {
  ssr: false,
  loading: () => (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="animate-pulse h-32 bg-muted rounded" />
    </div>
  ),
});

export default function AnuncioDetalheWrapper(props: AnuncioDetalheClientProps) {
  return <AnuncioDetalheClient {...props} />;
}
