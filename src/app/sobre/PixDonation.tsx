"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check } from "lucide-react";

const PIX_KEY = "39cb1f5e-f36d-4a75-a1e3-24f1a57b7dd9";
const PIX_BRCODE =
  "00020126580014BR.GOV.BCB.PIX013639cb1f5e-f36d-4a75-a1e3-24f1a57b7dd95204000053039865802BR5914Gianluca Ferro6009SAO PAULO62140510vgqQ8FZ1tK63040906";

export default function PixDonation() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(PIX_KEY);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = PIX_KEY;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <div className="bg-white dark:bg-gray-100 p-3 rounded-lg inline-block">
          <QRCodeSVG value={PIX_BRCODE} size={160} />
        </div>
      </div>
      <div className="bg-card border rounded-lg p-4">
        <p className="text-xs font-semibold text-muted-foreground mb-2">
          Chave Pix (aleatória)
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs font-mono font-bold text-foreground bg-muted px-3 py-2 rounded-md select-all break-all">
            {PIX_KEY}
          </code>
          <button
            onClick={handleCopy}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors min-h-[44px]"
            aria-label="Copiar chave Pix"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copiar
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Gianluca Ferro · Nubank</p>
      </div>
      <p className="text-[11px] text-muted-foreground text-center">
        💚 Qualquer contribuição, por menor que seja, ajuda a manter o projeto no ar.
      </p>
    </div>
  );
}
