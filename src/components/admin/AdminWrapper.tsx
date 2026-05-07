"use client";

import dynamic from "next/dynamic";

const AdminClient = dynamic(() => import("./AdminClient"), {
  ssr: false,
  loading: () => (
    <div className="container py-8">
      <div className="animate-pulse h-32 bg-muted rounded" />
    </div>
  ),
});

export default function AdminWrapper() {
  return <AdminClient />;
}
