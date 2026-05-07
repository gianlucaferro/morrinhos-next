import Link from "next/link";
import {
  BarChart3,
  Heart,
  GraduationCap,
  HandHeart,
  DollarSign,
  Wheat,
  ShieldAlert,
  TrendingUp,
  Building,
  Trees,
  TrendingUp as IndicadoresIcon,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Dados MHS — Painel completo de transparência de Morrinhos",
  description:
    "Hub central de todos os dados públicos consolidados de Morrinhos: saúde, educação, agro, social, impostos, segurança, meio ambiente, economia local, infraestrutura urbana e indicadores municipais.",
  path: "/dados-mhs",
});

type Card = {
  href: string;
  titulo: string;
  descricao: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
};

const cards: Card[] = [
  {
    href: "/saude",
    titulo: "Saúde",
    descricao: "Dengue, profissionais, estabelecimentos, internações, vacinação, óbitos.",
    icon: Heart,
    iconBg: "bg-red-500/10",
    iconColor: "text-red-500",
  },
  {
    href: "/educacao",
    titulo: "Educação",
    descricao: "IDEB, escolas, matrículas, infraestrutura, investimento por aluno.",
    icon: GraduationCap,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
  },
  {
    href: "/agro",
    titulo: "Agro",
    descricao: "Rebanhos, lavouras, leite, chuva e safra, calendário de plantio.",
    icon: Wheat,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600",
  },
  {
    href: "/beneficios-sociais",
    titulo: "Social",
    descricao: "Bolsa Família, CadÚnico, BPC, assistência social.",
    icon: HandHeart,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
  },
  {
    href: "/arrecadacao",
    titulo: "Impostos",
    descricao: "Arrecadação, IPTU, ISS, ICMS, receitas municipais.",
    icon: DollarSign,
    iconBg: "bg-green-500/10",
    iconColor: "text-green-600",
  },
  {
    href: "/seguranca",
    titulo: "Segurança",
    descricao: "Ocorrências, Polícia Militar, Bombeiros, trânsito.",
    icon: ShieldAlert,
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-500",
  },
  {
    href: "/meio-ambiente",
    titulo: "Meio Ambiente",
    descricao: "Uso do solo (MapBiomas), desmatamento, áreas protegidas, queimadas.",
    icon: Trees,
    iconBg: "bg-emerald-700/10",
    iconColor: "text-emerald-700",
  },
  {
    href: "/economia",
    titulo: "Economia Local",
    descricao: "Empregos formais, salários, empresas ativas, PIB municipal, MEIs.",
    icon: TrendingUp,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600",
  },
  {
    href: "/infraestrutura",
    titulo: "Infraestrutura Urbana",
    descricao: "Saneamento, energia, conectividade móvel, pavimentação, iluminação.",
    icon: Building,
    iconBg: "bg-slate-500/10",
    iconColor: "text-slate-600",
  },
  {
    href: "/indicadores",
    titulo: "Indicadores do Município",
    descricao: "População, PIB per capita, IDHM, IDEB, frota, salário médio, saneamento.",
    icon: IndicadoresIcon,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    href: "/comparador",
    titulo: "Comparador Municipal",
    descricao: "Morrinhos vs vizinhos: Pontalina, Hidrolândia, Bela Vista, Cristianópolis, Cromínia.",
    icon: Trophy,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
  },
];

export default function DadosPBAPage() {
  return (
    <div className="container py-6 max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
          <BarChart3 className="w-7 h-7 text-primary" />
          Dados <span className="text-[#25D366]">MHS</span>
        </h1>
        <p className="text-sm md:text-base text-muted-foreground mt-2 leading-relaxed max-w-3xl">
          Painel completo de transparência de Morrinhos. Todos os dados públicos consolidados
          das principais fontes oficiais (IBGE, INEP, DataSUS, TCM-GO, Tesouro Nacional, INMET,
          MapBiomas, ANEEL, SNIS e mais), atualizados automaticamente. Escolha a categoria abaixo:
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.href}
              href={c.href}
              className="stat-card card-hover group flex flex-col gap-2 py-5 text-left transition-transform"
            >
              <div
                className={`w-12 h-12 rounded-xl ${c.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform`}
              >
                <Icon className={`w-6 h-6 ${c.iconColor}`} />
              </div>
              <h2 className="text-base font-semibold text-foreground">{c.titulo}</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {c.descricao}
              </p>
            </Link>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground italic mt-8 text-center">
        Iniciativa cidadã independente — sem vínculo com a Prefeitura, Câmara ou qualquer órgão público.
        Cada dado tem link direto para a fonte oficial de origem.
      </p>
    </div>
  );
}
