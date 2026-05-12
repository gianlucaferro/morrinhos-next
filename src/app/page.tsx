import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Trash2,
  Pill,
  ShoppingBag,
  Phone,
  ExternalLink,
  Megaphone,
  Heart,
  GraduationCap,
  HandHeart,
  DollarSign,
  Wheat,
  ShieldAlert,
  BarChart3,
  FileText,
  TrendingUp,
  Building,
  Trees,
} from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { pageMetadata } from "@/lib/seo";
import {
  fetchIndicadores,
  fetchEmendas,
  fetchContratosResumo,
} from "@/lib/data/home";
import { AnuncioBannerDestaque, AnuncioBannerPadrao } from "@/components/AnuncioBanner";
import DengueAlert from "@/components/DengueAlert";
import PlantaoFarmaciasHome from "@/components/PlantaoFarmaciasHome";
import ClimaHeroBadge from "@/components/clima/ClimaHeroBadge";
import { HomeCivicInsights, HomeCivicSearch } from "@/components/home/HomeCivicClient";

export const metadata = pageMetadata({
  title: "Morrinhos.ai — Transparência municipal de Morrinhos GO com IA",
  description:
    "Portal de transparência municipal de Morrinhos, Goiás com IA. Câmara, prefeitura, vereadores, contratos, classificados, farmácias e mais.",
  path: "/",
});

export const revalidate = 3600;

function MiniCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="stat-card text-center">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p className="text-2xl md:text-3xl font-extrabold text-foreground mt-1">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function UnavailableCard({ label }: { label: string }) {
  return (
    <div className="stat-card text-center opacity-60">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p className="text-sm text-muted-foreground mt-2">Em breve</p>
    </div>
  );
}

export default async function HomePage() {
  const [indicadores, contratos, emendas] = await Promise.all([
    fetchIndicadores().catch(() => []),
    fetchContratosResumo().catch(() => null),
    fetchEmendas(new Date().getFullYear()).catch(() => []),
  ]);

  const indicadorMap = new Map(indicadores.map((i) => [i.chave, i]));
  const pop = indicadorMap.get("populacao");
  const pib = indicadorMap.get("pib_per_capita");
  const ideb = indicadorMap.get("ideb_anos_iniciais");
  const saneamento = indicadorMap.get("saneamento_cobertura");
  const salarioMedio = indicadorMap.get("salario_medio_formal");
  const pessoalOcupado = indicadorMap.get("pessoal_ocupado_formal");
  const popMeioSm = indicadorMap.get("populacao_ate_meio_sm");
  const frota = indicadorMap.get("frota_veiculos");
  const idhm = indicadorMap.get("idhm");

  const totalEmendas = emendas.reduce((s, e) => s + (e.valor_pago || 0), 0);

  return (
    <>
      {/* Hero */}
      <section
        className="relative overflow-hidden text-white"
        style={{
          background:
            "linear-gradient(to bottom right, hsl(220,60%,15%), hsl(160,40%,18%))",
        }}
      >
        <ClimaHeroBadge />
        <div className="container relative py-10 md:py-16">
          <div className="flex items-center gap-5 md:gap-8">
            <Image
              src="/icon-192.png"
              alt="Morrinhos.ai"
              width={112}
              height={112}
              className="w-20 h-20 md:w-28 md:h-28 rounded-2xl object-contain bg-white/15 p-2 flex-shrink-0 shadow-lg"
              priority
            />
            <div>
              <h1 className="text-2xl md:text-4xl font-extrabold leading-tight tracking-tight">
                Transparência pública
                <br />
                <span className="text-white/90">de Morrinhos, GO</span>
              </h1>
              <p className="mt-3 text-white/75 text-sm md:text-base max-w-lg leading-relaxed">
                Dados públicos de Morrinhos organizados em um único ambiente, com base
                oficial e inteligência artificial.
              </p>
              <HomeCivicSearch variant="hero" />
            </div>
          </div>
        </div>
      </section>

      <div className="container py-8 space-y-10">
        {/* Anúncio destaque */}
        <AnuncioBannerDestaque />

        {/* Atalhos */}
        <section
          aria-labelledby="heading-atalhos"
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          <h2 id="heading-atalhos" className="sr-only">Serviços rápidos</h2>
          <Link href="/zap-mhs" className="stat-card card-hover flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-[#25D366]/10 flex items-center justify-center shrink-0">
              <WhatsAppIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">
                Zap <span className="text-[#25D366]">MHS</span>
              </p>
              <p className="text-xs text-muted-foreground">WhatsApp de estabelecimentos</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-[#25D366] transition-colors" />
          </Link>
          <Link href="/coleta-lixo" className="stat-card card-hover flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">Coleta de Lixo</p>
              <p className="text-xs text-muted-foreground">Dias e orientações sobre a coleta</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
          </Link>
          <Link href="/plantao-farmacias" className="stat-card card-hover flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
              <Pill className="w-5 h-5 text-orange-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">Farmácias de Plantão</p>
              <p className="text-xs text-muted-foreground">Quem está aberto esta semana</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-orange-500 transition-colors" />
          </Link>
        </section>

        {/* Compra e Venda MHS */}
        <Link href="/compra-e-venda" className="stat-card card-hover flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-full bg-[#25D366]/10 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-6 h-6 text-[#25D366]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-foreground">
              Compra e Venda <span className="text-[#25D366]">MHS</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Anuncie grátis em Morrinhos — imóveis, veículos, serviços e mais.
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0 group-hover:text-[#25D366] transition-colors" />
        </Link>

        {/* Plantão de Farmácias */}
        <PlantaoFarmaciasHome />

        {/* Alerta Dengue */}
        <DengueAlert />

        {/* Contatos Úteis (resumo) — bloco escondido até termos contatos oficiais de Morrinhos.
            TODO: substituir pelos números reais quando coletados (ver src/app/contatos/page.tsx). */}
        <section aria-labelledby="heading-contatos">
          <div className="flex items-center justify-between mb-4">
            <h2 id="heading-contatos" className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary" />
              Contatos de Emergência
            </h2>
            <Link href="/contatos" className="text-xs text-primary hover:underline flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a href="tel:190" className="stat-card card-hover flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-primary/10">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">Polícia Militar</p>
                <p className="text-xs text-muted-foreground">190</p>
              </div>
            </a>
            <a href="tel:193" className="stat-card card-hover flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-primary/10">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">Bombeiros</p>
                <p className="text-xs text-muted-foreground">193</p>
              </div>
            </a>
            <a href="tel:192" className="stat-card card-hover flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-primary/10">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">SAMU</p>
                <p className="text-xs text-muted-foreground">192</p>
              </div>
            </a>
          </div>
        </section>

        {/* Anuncie CTA */}
        <section aria-label="Anuncie no Morrinhos.ai">
          <div className="stat-card border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-start gap-4 flex-col sm:flex-row">
              <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                <Megaphone className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">Anuncie no Morrinhos.ai</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Seu negócio visto por centenas de moradores de Morrinhos todos os dias. Público 100% local e qualificado.
                </p>
              </div>
              <Link
                href="/anuncie"
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium bg-[#25D366] text-white hover:bg-[#1da851] transition-colors"
              >
                Saiba mais
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Morrinhos em Dados */}
        <section aria-labelledby="heading-dados">
          <h2 id="heading-dados" className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary" />
            Morrinhos em Dados
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Link href="/saude" className="stat-card card-hover flex flex-col items-center gap-2 py-5 group text-center">
              <Heart className="w-7 h-7 text-red-500 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-foreground">Saúde</span>
              <span className="text-[10px] text-muted-foreground leading-tight">Dengue, profissionais, estabelecimentos</span>
            </Link>
            <Link href="/educacao" className="stat-card card-hover flex flex-col items-center gap-2 py-5 group text-center">
              <GraduationCap className="w-7 h-7 text-blue-500 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-foreground">Educação</span>
              <span className="text-[10px] text-muted-foreground leading-tight">IDEB, escolas, matrículas, investimento</span>
            </Link>
            <Link href="/beneficios-sociais" className="stat-card card-hover flex flex-col items-center gap-2 py-5 group text-center">
              <HandHeart className="w-7 h-7 text-purple-500 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-foreground">Social</span>
              <span className="text-[10px] text-muted-foreground leading-tight">Bolsa Família, CadÚnico, assistência</span>
            </Link>
            <Link href="/arrecadacao" className="stat-card card-hover flex flex-col items-center gap-2 py-5 group text-center">
              <DollarSign className="w-7 h-7 text-green-600 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-foreground">Impostos</span>
              <span className="text-[10px] text-muted-foreground leading-tight">Arrecadação, IPTU, ISS, receitas</span>
            </Link>
            <Link href="/agro" className="stat-card card-hover flex flex-col items-center gap-2 py-5 group text-center">
              <Wheat className="w-7 h-7 text-amber-600 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-foreground">Agro</span>
              <span className="text-[10px] text-muted-foreground leading-tight">PIB agro, produtividade, ranking</span>
            </Link>
            <Link href="/seguranca" className="stat-card card-hover flex flex-col items-center gap-2 py-5 group text-center">
              <ShieldAlert className="w-7 h-7 text-orange-500 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-foreground">Segurança</span>
              <span className="text-[10px] text-muted-foreground leading-tight">Ocorrências, PM, Bombeiros</span>
            </Link>
            <Link href="/economia" className="stat-card card-hover flex flex-col items-center gap-2 py-5 group text-center">
              <TrendingUp className="w-7 h-7 text-emerald-600 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-foreground">Economia Local</span>
              <span className="text-[10px] text-muted-foreground leading-tight">Empregos, salários, empresas, PIB</span>
            </Link>
            <Link href="/infraestrutura" className="stat-card card-hover flex flex-col items-center gap-2 py-5 group text-center">
              <Building className="w-7 h-7 text-slate-600 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-foreground">Infraestrutura</span>
              <span className="text-[10px] text-muted-foreground leading-tight">Saneamento, energia, conectividade</span>
            </Link>
            <Link href="/meio-ambiente" className="stat-card card-hover flex flex-col items-center gap-2 py-5 group text-center">
              <Trees className="w-7 h-7 text-emerald-700 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-foreground">Meio Ambiente</span>
              <span className="text-[10px] text-muted-foreground leading-tight">MapBiomas, desmatamento, queimadas</span>
            </Link>
          </div>
          {/* CTA pro hub completo de dados */}
          <div className="mt-3 text-center">
            <Link
              href="/dados-mhs"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:opacity-80 transition-opacity"
            >
              Ver Dados <span className="text-[#25D366] font-bold">MHS</span> completo
              <ArrowRight className="w-4 h-4 text-primary" />
            </Link>
          </div>
        </section>

        {/* Anúncio padrão */}
        <AnuncioBannerPadrao />

        {/* Indicadores */}
        <section aria-labelledby="heading-indicadores">
          <h2 id="heading-indicadores" className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            Indicadores do Município
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {pop ? <MiniCard label="População" value={pop.valor_texto || "—"} sub={`IBGE est. ${pop.ano_referencia}`} /> : <UnavailableCard label="População" />}
            {pib ? <MiniCard label="PIB per capita" value={pib.valor_texto || "—"} sub={`IBGE ${pib.ano_referencia}`} /> : <UnavailableCard label="PIB per capita" />}
            {ideb ? <MiniCard label="IDEB Anos Iniciais" value={ideb.valor_texto || "—"} sub={`INEP ${ideb.ano_referencia}`} /> : <UnavailableCard label="IDEB Anos Iniciais" />}
            {saneamento ? <MiniCard label="Saneamento" value={saneamento.valor_texto || "—"} sub={`Cobertura ${saneamento.ano_referencia}`} /> : <UnavailableCard label="Saneamento" />}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-3">
            {salarioMedio ? <MiniCard label="Salário médio formal" value={salarioMedio.valor_texto || "—"} sub={`IBGE ${salarioMedio.ano_referencia}`} /> : <UnavailableCard label="Salário médio formal" />}
            {pessoalOcupado ? <MiniCard label="Empregos formais" value={pessoalOcupado.valor_texto || "—"} sub={`IBGE ${pessoalOcupado.ano_referencia}`} /> : <UnavailableCard label="Empregos formais" />}
            {popMeioSm ? <MiniCard label="Pop. até ½ salário mín." value={popMeioSm.valor_texto || "—"} sub={`Censo ${popMeioSm.ano_referencia}`} /> : <UnavailableCard label="Pop. até ½ salário mín." />}
            {frota ? <MiniCard label="Frota de veículos" value={frota.valor_texto || frota.valor?.toLocaleString("pt-BR") || "—"} sub={`SENATRAN ${frota.ano_referencia}`} /> : <UnavailableCard label="Frota de veículos" />}
            {idhm ? <MiniCard label="IDHM" value={`${idhm.valor_texto || "—"} (Alto)`} sub={`PNUD ${idhm.ano_referencia}`} /> : <UnavailableCard label="IDHM" />}
          </div>
        </section>

        {/* Emendas */}
        {emendas.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-primary" />
              Emendas Parlamentares ({new Date().getFullYear()})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <MiniCard label="Total recebido" value={totalEmendas.toLocaleString("pt-BR", { style: "currency", currency: "BRL", notation: "compact" })} />
              <Link href="/emendas" className="stat-card card-hover flex items-center gap-3 group">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">{emendas.length} emendas registradas</p>
                  <p className="text-sm font-semibold text-foreground">Ver detalhes →</p>
                </div>
              </Link>
            </div>
          </section>
        )}

        {/* Contratos resumo */}
        {contratos && contratos.ativos > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-primary" />
              Contratos Ativos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <MiniCard label="Contratos ativos" value={contratos.ativos.toString()} />
              <MiniCard label="Valor total" value={contratos.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL", notation: "compact" })} />
              {contratos.maiorFornecedor.nome && (
                <MiniCard label="Maior fornecedor" value={contratos.maiorFornecedor.nome.slice(0, 20)} sub={contratos.maiorFornecedor.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", notation: "compact" })} />
              )}
            </div>
          </section>
        )}

        <HomeCivicInsights />
      </div>
    </>
  );
}
