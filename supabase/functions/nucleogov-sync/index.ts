// Sincroniza dados do Portal de Transparência de Morrinhos (NucleoGov) via API JSON.
//
// Endpoint público descoberto:
//   GET https://acessoainformacao.morrinhos.go.gov.br/api/{modulo}?acao={metodo}&dados={JSON}
//
// Módulos cobertos:
//   - leis        → leis_municipais
//   - atos (tipo=1) → decretos
//   - atos (tipo=3) → portarias
//   - atos (tipo=?) → resolucoes  (filtrado por tipo_nome='Resolução')
//   - obras       → obras
//   - sgrgf       → relatorios_fiscais (tipo='RGF')
//   - sgrreo      → relatorios_fiscais (tipo='RREO')
//
// Idempotente: usa nucleogov_id como UNIQUE pra upsert.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const NUCLEO_PREF_BASE = "https://acessoainformacao.morrinhos.go.gov.br";
const NUCLEO_CAMARA_BASE = "https://acessoainformacao.morrinhos.go.leg.br";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ===== Tipagem =====
type NucleoRow = Record<string, unknown> & { id?: string };
type NucleoBase = "prefeitura" | "camara";

interface SyncConfig {
  base?: NucleoBase; // default: prefeitura
  modulo: string;
  acao: string;
  filtros?: Record<string, unknown>;
  tabela: string;
  pageSize?: number;
  maxPages?: number;
  fonteRef: string; // path do portal usado como Referer + base do fonte_url
  mapper: (r: NucleoRow, base: string) => Record<string, unknown> | null;
  // Para endpoints que ignoram paginação (atividades_legislativas):
  // usar acao=exportar que devolve TUDO num único request
  useExport?: boolean;
}

function baseUrl(base: NucleoBase = "prefeitura"): string {
  return base === "camara" ? NUCLEO_CAMARA_BASE : NUCLEO_PREF_BASE;
}

// ===== Configs por target =====
const CONFIGS: Record<string, SyncConfig> = {
  // 1) Leis municipais (~3.119 registros)
  leis: {
    modulo: "leis",
    acao: "buscaAvancada",
    tabela: "leis_municipais",
    pageSize: 100,
    maxPages: 50,
    fonteRef: "cidadao/legislacao/leis",
    mapper: (r) => {
      const dp = (r.data_publicacao as string | null) ?? null;
      const ano = dp ? parseInt(dp.slice(0, 4)) : null;
      const numero = r.numero ? `${r.numero}` : `s/n-${r.id}`;
      return {
        nucleogov_id: `leis:${r.id}`,
        numero,
        ano,
        data_publicacao: dp,
        ementa: (r.ementa as string) ?? "(sem ementa)",
        categoria: (r.categoria_descricao as string) ?? null,
        fonte_url: `${NUCLEO_PREF_BASE}/cidadao/legislacao/lei/id=${r.id}`,
      };
    },
  },

  // 2) Decretos (filtro tipo=1 em atos)
  decretos: {
    modulo: "atos",
    acao: "buscaAvancada",
    filtros: { tipo: "1" },
    tabela: "decretos",
    pageSize: 100,
    maxPages: 200,
    fonteRef: "cidadao/legislacao/decretos",
    mapper: (r) => {
      // No NucleoGov tabela `atos` mistura tipos — filtramos por tipo_nome
      if (r.tipo_nome !== "Decreto") return null;
      const ano = r.ano ? parseInt(`${r.ano}`) : null;
      return {
        nucleogov_id: `atos:${r.id}`,
        numero: `${r.numero}`,
        ano,
        data_publicacao: (r.data_publicacao as string) ?? null,
        ementa: (r.ementa as string) ?? "(sem ementa)",
        orgao: (r.orgao as string) ?? null,
        fonte_url: `${NUCLEO_PREF_BASE}/cidadao/legislacao/ato/id=${r.id}`,
      };
    },
  },

  // 3) Portarias (filtro tipo=3 em atos)
  portarias: {
    modulo: "atos",
    acao: "buscaAvancada",
    filtros: { tipo: "3" },
    tabela: "portarias",
    pageSize: 100,
    maxPages: 200,
    fonteRef: "cidadao/legislacao/portarias",
    mapper: (r) => {
      if (r.tipo_nome !== "Portaria") return null;
      const ano = r.ano ? parseInt(`${r.ano}`) : null;
      return {
        nucleogov_id: `atos:${r.id}`,
        numero: `${r.numero}`,
        ano,
        data_publicacao: (r.data_publicacao as string) ?? null,
        ementa: (r.ementa as string) ?? "(sem ementa)",
        orgao: (r.orgao as string) ?? null,
        fonte_url: `${NUCLEO_PREF_BASE}/cidadao/legislacao/ato/id=${r.id}`,
      };
    },
  },

  // 4) Resoluções
  resolucoes: {
    modulo: "atos",
    acao: "buscaAvancada",
    filtros: {},
    tabela: "resolucoes",
    pageSize: 100,
    maxPages: 50,
    fonteRef: "cidadao/legislacao/resolucoes",
    mapper: (r) => {
      if (r.tipo_nome !== "Resolução" && r.tipo_nome !== "Resolucao") return null;
      const ano = r.ano ? parseInt(`${r.ano}`) : null;
      if (!ano) return null;
      return {
        nucleogov_id: `atos:${r.id}`,
        numero: `${r.numero}`,
        ano,
        data_publicacao: (r.data_publicacao as string) ?? null,
        ementa: (r.ementa as string) ?? "(sem ementa)",
        orgao: (r.orgao as string) ?? null,
        fonte_url: `${NUCLEO_PREF_BASE}/cidadao/legislacao/ato/id=${r.id}`,
      };
    },
  },

  // 5) Obras
  obras: {
    modulo: "obras",
    acao: "busca_avancada",
    tabela: "obras",
    pageSize: 50,
    maxPages: 20,
    fonteRef: "cidadao/informacao/obras",
    mapper: (r) => {
      const valor = r.valor ? parseFloat(`${r.valor}`) : null;
      const vpago = r.valor_total_pago ? parseFloat(`${r.valor_total_pago}`) : null;
      const vadit = r.valor_aditivos ? parseFloat(`${r.valor_aditivos}`) : null;
      const sit = r.situacao_id ? parseInt(`${r.situacao_id}`) : null;
      const statusMap: Record<number, string> = {
        1: "Em Licitação",
        2: "Em Contratação",
        3: "Em Execução",
        4: "Em Obras",
        5: "Concluído",
        6: "Cancelado",
        7: "Inadimplente",
        17: "Paralisada",
        18: "Suspensa",
      };
      return {
        nucleogov_id: `obras:${r.id}`,
        nome: (r.nome as string) ?? "(sem nome)",
        local: (r.endereco as string) ?? null,
        valor,
        empresa: (r.nome_contratado as string) ?? null,
        status: sit !== null ? (statusMap[sit] ?? `Situação ${sit}`) : null,
        situacao_id: sit,
        data_inicio: (r.data_inicio as string) ?? null,
        previsao_termino: (r.previsao_termino as string) ?? null,
        percentual_executado: (r.percentual_executado as string) ?? null,
        numero_contrato: (r.numero_contrato as string) ?? null,
        cpf_cnpj_contratado: (r.cpf_cnpj_contratado as string) ?? null,
        objeto_contrato: (r.objeto_contrato as string) ?? null,
        valor_total_pago: vpago,
        valor_aditivos: vadit,
        link_obra: (r.link_obra as string) ?? null,
        responsavel: (r.responsavel as string) ?? null,
        fonte_url: `${NUCLEO_PREF_BASE}/cidadao/informacao/obras`,
      };
    },
  },

  // 6) RGF
  rgf: {
    modulo: "sgrgf",
    acao: "listar",
    tabela: "relatorios_fiscais",
    pageSize: 200,
    maxPages: 10,
    fonteRef: "cidadao/resp_fiscal/sgrgf",
    mapper: (r) => mapRelatorioFiscal(r, "RGF"),
  },

  // 7) RREO
  rreo: {
    modulo: "sgrreo",
    acao: "listar",
    tabela: "relatorios_fiscais",
    pageSize: 200,
    maxPages: 10,
    fonteRef: "cidadao/resp_fiscal/sgrreo",
    mapper: (r) => mapRelatorioFiscal(r, "RREO"),
  },

  // ========== CÂMARA DE VEREADORES (.leg.br) ==========

  // 8) Atos da Câmara (decretos legislativos, portarias da câmara, resoluções) ~1.054 registros
  camara_atos: {
    base: "camara",
    modulo: "atos",
    acao: "buscaAvancada",
    tabela: "camara_atos",
    pageSize: 100,
    maxPages: 20,
    fonteRef: "cidadao/legislacao/decretos",
    mapper: (r, base) => {
      const ano = r.ano ? parseInt(`${r.ano}`) : null;
      const tipoNome = (r.tipo_nome as string) ?? "Ato";
      const tipoCod = (r.tipo as string) ?? null;
      return {
        nucleogov_id: `camara_atos:${r.id}`,
        tipo: tipoNome,
        tipo_codigo: tipoCod,
        numero: `${r.numero ?? "s/n"}`,
        descricao: (r.ementa as string) ?? "(sem ementa)",
        data_publicacao: (r.data_publicacao as string) ?? null,
        ano,
        fonte_url: `${base}/cidadao/legislacao/ato/id=${r.id}`,
      };
    },
  },

  // 9) Atividades Legislativas (projetos de lei, requerimentos, indicações, moções) ~812 registros
  // ⚠️ A API "listar" da câmara IGNORA paginação — sempre devolve só 15 itens.
  // Solução: usar acao="exportar" que devolve TODOS num único response.
  camara_projetos: {
    base: "camara",
    modulo: "atividades_legislativas",
    acao: "exportar",
    useExport: true,
    tabela: "projetos",
    fonteRef: "cidadao/legislacao/atividades_legislativas",
    mapper: (r, base) => {
      // Campo único: "ato_legislativo" = "Projeto de Lei do Executivo 3.669/2026"
      // Parsear pra extrair tipo + numero + ano
      const atoStr = (r.ato_legislativo as string) ?? "";
      const m = atoStr.match(/^(.+?)\s+([\d\.\/]+?)\/(\d{4})$/);
      let tipo = "Ato Legislativo";
      let numero = (r.numero as string) ?? "s/n";
      let ano: number | null = null;
      if (m) {
        tipo = m[1].trim();
        numero = m[2];
        ano = parseInt(m[3]);
      }

      // Converter DD/MM/YYYY → YYYY-MM-DD
      const pub = (r.publicacao as string) ?? null;
      let dataIso: string | null = null;
      if (pub && /^\d{2}\/\d{2}\/\d{4}$/.test(pub)) {
        const [d, mo, y] = pub.split("/");
        dataIso = `${y}-${mo}-${d}`;
        if (!ano) ano = parseInt(y);
      }

      // Limpar HTML da ementa
      const ementaRaw = (r.ementa as string) ?? "";
      const ementa = ementaRaw
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim() || "(sem ementa)";

      // Chave única: usar a string completa do ato_legislativo (única por natureza)
      const uniqueKey = atoStr || `${tipo}-${numero}-${ano}`;

      return {
        nucleogov_id: `camara_projetos:${uniqueKey}`,
        tipo,
        numero,
        ano,
        data: dataIso,
        ementa,
        origem: tipo, // ex: "Projeto de Lei do Executivo"
        autor_texto: (r.autoria as string) ?? "(sem autoria)",
        status: (r.situacao as string) ?? null,
        fonte_visualizar_url: `${base}/cidadao/legislacao/atividades_legislativas`,
      };
    },
  },

  // 10) Apreciação de Contas dos Vereadores (TCM-GO) ~5 registros
  camara_apreciacao: {
    base: "camara",
    modulo: "apreciacao_contas",
    acao: "listar",
    tabela: "camara_apreciacao_contas",
    pageSize: 100,
    maxPages: 5,
    fonteRef: "cidadao/legislacao/apreciacao_contas",
    mapper: (r, base) => {
      const id = (r.id as string) ?? null;
      if (!id) return null;
      const ano = r.ano ? parseInt(`${r.ano}`) : null;
      if (!ano) return null;
      return {
        nucleogov_id: `camara_apreciacao:${id}`,
        ano,
        anos_referencia: (r.anos as string) ?? null,
        numero: (r.numero as string) ?? null,
        tipo: (r.tipo as string) ?? null,
        status: (r.status as string) ?? null,
        ementa: (r.ementa as string) ?? null,
        data_publicacao: (r.data_publicacao as string) ?? null,
        link: (r.link as string) ?? null,
        fonte_url: `${base}/cidadao/legislacao/apreciacao_contas`,
      };
    },
  },
};

function mapRelatorioFiscal(
  r: NucleoRow,
  tipo: "RGF" | "RREO" | "BALANCO",
): Record<string, unknown> | null {
  const ano = r.ano ? parseInt(`${r.ano}`) : null;
  if (!ano) return null;
  const mes = r.mes ? parseInt(`${r.mes}`) : null;
  let anexoNome: string | null = null;
  let anexoChave: string | null = (r.chave as string) ?? null;
  try {
    if (typeof r.anexos === "string") {
      const a = JSON.parse(r.anexos);
      anexoNome = a.nomeAnexo ?? null;
    }
  } catch {
    /* ignore */
  }
  return {
    nucleogov_id: `${tipo.toLowerCase()}:${r.chave ?? `${ano}-${mes}-${r.descricao}`}`,
    tipo,
    ano,
    mes,
    descricao: `${r.descricao}` ?? "(sem descrição)",
    orgao: (r.orgao as string) ?? null,
    data_publicacao: (r.data_publicacao as string) ?? null,
    anexo_nome: anexoNome,
    anexo_chave: anexoChave,
    fonte_url: `${NUCLEO_PREF_BASE}/cidadao/resp_fiscal/sg${tipo.toLowerCase()}`,
  };
}

// ===== Fetch helper =====
async function fetchNucleo(
  base: NucleoBase,
  modulo: string,
  acao: string,
  dados: Record<string, unknown>,
  referer: string,
): Promise<{ dados: NucleoRow[]; total?: string }> {
  const params = new URLSearchParams();
  params.set("acao", acao);
  params.set("dados", JSON.stringify(dados));
  const bUrl = baseUrl(base);
  const url = `${bUrl}/api/${modulo}?${params}`;

  const resp = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Accept": "application/json, text/javascript, */*; q=0.01",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      "X-Requested-With": "XMLHttpRequest",
      "Referer": `${bUrl}/${referer}`,
    },
  });

  if (!resp.ok) {
    throw new Error(`NucleoGov[${base}] ${modulo}/${acao} HTTP ${resp.status}`);
  }

  const txt = await resp.text();
  // Algumas respostas podem vir como array (não objeto): listarTipos etc.
  const json = JSON.parse(txt);
  if (Array.isArray(json)) return { dados: json };
  return { dados: json.dados ?? [], total: json.total };
}

// ===== Sync routine =====
async function runSync(target: string, supabase: ReturnType<typeof createClient>) {
  const cfg = CONFIGS[target];
  if (!cfg) throw new Error(`Target desconhecido: ${target}`);

  const base: NucleoBase = cfg.base ?? "prefeitura";
  const bUrl = baseUrl(base);
  const startedAt = Date.now();
  let inserted = 0;
  let skipped = 0;
  let pagesProcessed = 0;
  let totalDeclared = Infinity;

  // ===== Modo EXPORT: chama acao=exportar com formato=json (1 request retorna tudo) =====
  if (cfg.useExport) {
    const dados = { filtros: { ...(cfg.filtros ?? {}), exportar: true }, formato: "json" };
    const { dados: rows } = await fetchNucleo(base, cfg.modulo, cfg.acao, dados, cfg.fonteRef);
    pagesProcessed = 1;
    totalDeclared = rows.length;

    if (rows.length > 0) {
      const mapped = rows
        .map((r) => cfg.mapper(r, bUrl))
        .filter((x): x is Record<string, unknown> => x !== null);
      skipped = rows.length - mapped.length;

      // Dedupe localmente por nucleogov_id (NucleoGov retorna duplicates no exportar)
      const seen = new Set<string>();
      const deduped: Record<string, unknown>[] = [];
      for (const m of mapped) {
        const id = m.nucleogov_id as string;
        if (seen.has(id)) continue;
        seen.add(id);
        deduped.push(m);
      }
      skipped += mapped.length - deduped.length;

      // Upsert em batches de 200 pra não estourar payload
      const batchSize = 200;
      for (let i = 0; i < deduped.length; i += batchSize) {
        const batch = deduped.slice(i, i + batchSize);
        const { error } = await supabase
          .from(cfg.tabela)
          .upsert(batch, { onConflict: "nucleogov_id" });
        if (error) {
          throw new Error(`Upsert ${cfg.tabela} (batch ${i}): ${error.message}`);
        }
        inserted += batch.length;
      }
    }

    return {
      target,
      inserted,
      skipped,
      pagesProcessed,
      totalDeclared,
      elapsedMs: Date.now() - startedAt,
      mode: "export",
    };
  }

  // ===== Modo PAGINADO normal =====
  const pageSize = cfg.pageSize ?? 100;
  const maxPages = cfg.maxPages ?? 50;
  let offset = 0;

  for (let p = 0; p < maxPages; p++) {
    const dados: Record<string, unknown> = {
      limit: `${offset}, ${pageSize}`,
      search: "",
      ...(cfg.filtros ?? {}),
    };

    const { dados: rows, total } = await fetchNucleo(
      base,
      cfg.modulo,
      cfg.acao,
      dados,
      cfg.fonteRef,
    );
    pagesProcessed++;

    if (total) totalDeclared = parseInt(total);
    if (rows.length === 0) break;

    const mapped = rows
      .map((r) => cfg.mapper(r, bUrl))
      .filter((x): x is Record<string, unknown> => x !== null);

    skipped += rows.length - mapped.length;

    if (mapped.length > 0) {
      const { error } = await supabase
        .from(cfg.tabela)
        .upsert(mapped, { onConflict: "nucleogov_id" });

      if (error) {
        throw new Error(
          `Upsert ${cfg.tabela} (page ${p}, offset ${offset}): ${error.message}`,
        );
      }

      inserted += mapped.length;
    }

    offset += pageSize;
    if (rows.length < pageSize) break;
    if (offset >= totalDeclared) break;

    await new Promise((res) => setTimeout(res, 200));
  }

  return {
    target,
    inserted,
    skipped,
    pagesProcessed,
    totalDeclared: totalDeclared === Infinity ? null : totalDeclared,
    elapsedMs: Date.now() - startedAt,
    mode: "paginated",
  };
}

// ===== Handler =====
// Validação de CRON_SECRET — bloqueia invocações públicas não autorizadas.
// Aceita requisições com:
//   - header `x-cron-secret` = CRON_SECRET (cron interno)
//   - header `Authorization: Bearer <service_role_key>` (admin manual)
//   - Authorization Bearer com anon key NÃO é suficiente.
function authorize(req: Request): { ok: boolean; reason?: string } {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const headerCron = req.headers.get("x-cron-secret");
  if (cronSecret && headerCron && headerCron === cronSecret) {
    return { ok: true };
  }
  const auth = req.headers.get("authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && auth === `Bearer ${serviceKey}`) {
    return { ok: true };
  }
  return { ok: false, reason: "missing or invalid x-cron-secret / service_role" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authz = authorize(req);
  if (!authz.ok) {
    return new Response(JSON.stringify({ error: "unauthorized", reason: authz.reason }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const target = url.searchParams.get("target");
  const all = url.searchParams.get("all") === "1";

  if (!target && !all) {
    return new Response(
      JSON.stringify({
        error: "Passe ?target=leis|decretos|portarias|resolucoes|obras|rgf|rreo OU ?all=1",
        targets: Object.keys(CONFIGS),
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const targets = all ? Object.keys(CONFIGS) : [target!];
    const results = [];

    for (const t of targets) {
      try {
        const r = await runSync(t, supabase);
        results.push({ ok: true, ...r });
      } catch (e) {
        results.push({ ok: false, target: t, error: (e as Error).message });
      }
    }

    return new Response(
      JSON.stringify({ ok: true, results }, null, 2),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
