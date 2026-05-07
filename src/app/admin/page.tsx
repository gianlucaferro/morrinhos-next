import { pageMetadata } from "@/lib/seo";
import AdminClient from "@/components/admin/AdminWrapper";

export const metadata = pageMetadata({
  title: "Painel Administrativo",
  description: "Área administrativa do Morrinhos.ai.",
  path: "/admin",
  noIndex: true,
});

export default function AdminPage() {
  return <AdminClient />;
}
