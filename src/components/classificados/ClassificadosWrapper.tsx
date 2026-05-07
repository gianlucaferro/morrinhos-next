"use client";

import dynamic from "next/dynamic";

const ClassificadosClient = dynamic(() => import("./ClassificadosClient"), {
  ssr: false,
  loading: () => (
    <div className="container py-8">
      <div className="animate-pulse h-32 bg-muted rounded" />
    </div>
  ),
});

export default function ClassificadosWrapper() {
  return <ClassificadosClient />;
}
