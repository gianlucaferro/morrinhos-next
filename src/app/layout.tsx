import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import SiteLayout from "@/components/layout/SiteLayout";
import { siteIdentityGraph } from "@/lib/seo";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-jakarta",
});

const SITE_URL = "https://morrinhos.ai";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Morrinhos.ai — Transparência municipal de Morrinhos GO com IA",
    template: "%s | Morrinhos.ai",
  },
  description:
    "Morrinhos GO — Portal de transparência municipal com inteligência artificial. Classificados gratuitos, farmácias de plantão, WhatsApp de comércios, coleta de lixo, vereadores, contratos, licitações, servidores, salários e gastos públicos de Morrinhos, Goiás.",
  keywords: [
    "Morrinhos",
    "Morrinhos GO",
    "Morrinhos Goiás",
    "transparência municipal",
    "câmara municipal Morrinhos",
    "prefeitura Morrinhos",
    "vereadores Morrinhos",
    "salários servidores Morrinhos",
    "contratos prefeitura",
    "licitações Morrinhos",
    "classificados Morrinhos",
    "compra e venda Morrinhos",
    "farmácia de plantão Morrinhos",
    "coleta de lixo Morrinhos",
    "zap MHS",
    "MHS.ai",
    "transparência pública Goiás",
  ],
  authors: [{ name: "Ferro Labs Tecnologia LTDA" }],
  creator: "Ferro Labs Tecnologia LTDA",
  publisher: "Ferro Labs Tecnologia LTDA",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: "Morrinhos.ai",
    title: "Morrinhos.ai — Transparência municipal de Morrinhos GO com IA",
    description:
      "Portal de transparência municipal com IA. Projetos de lei, contratos, licitações, servidores e gastos públicos.",
    images: [
      {
        url: "/icon-192.png",
        width: 192,
        height: 192,
        alt: "Morrinhos.ai - Transparência municipal com IA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Morrinhos.ai — Transparência municipal de Morrinhos GO com IA",
    description:
      "Portal de transparência municipal com IA. Projetos de lei, contratos, licitações, servidores e gastos públicos.",
    images: ["/icon-192.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "8NEoxQgSBlfSM-jGfN96PRzLBev-CnMbIpRQ0K6Kjo0",
  },
  other: {
    "geo.region": "BR-GO",
    "geo.placename": "Morrinhos, Goiás",
    "geo.position": "-17.3028;-49.0167",
    ICBM: "-17.3028, -49.0167",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Morrinhos.ai",
  },
};

export const viewport: Viewport = {
  themeColor: "#1e3a5f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Schema canonico do site — moved to lib/seo.ts pra ser referenciavel via @id
// em outras paginas (Datasets, Articles etc).
//
// IMPORTANTE: nao declaramos Morrinhos.ai como GovernmentOrganization. O site
// e' NewsMediaOrganization independente. Prefeitura, Camara e TCM-GO aparecem
// como entidades SEPARADAS (com @id distinto + url oficial), referenciadas
// quando dados deles sao agregados — sem impersonacao.
const websiteJsonLd = siteIdentityGraph();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${jakarta.variable} font-md`}>
      <head>
        <link rel="dns-prefetch" href="https://pgqztmtimakiikcsvfph.supabase.co" />
        <link
          rel="preconnect"
          href="https://pgqztmtimakiikcsvfph.supabase.co"
          crossOrigin="anonymous"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body className="font-sans antialiased min-h-full" suppressHydrationWarning>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`}
        </Script>

        <SiteLayout>{children}</SiteLayout>

        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-Q51Q5C93RF"
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-Q51Q5C93RF',{send_page_view:true});`}
        </Script>
      </body>
    </html>
  );
}
