import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, Landmark } from "lucide-react";

// Map of party abbreviations to HSL color classes
const PARTY_COLORS: Record<string, string> = {
  PT: "bg-red-600",
  PL: "bg-blue-800",
  PP: "bg-sky-600",
  UB: "bg-indigo-600",
  "União": "bg-indigo-600",
  PSB: "bg-amber-600",
  PDT: "bg-red-500",
  PODE: "bg-teal-600",
  PSD: "bg-orange-600",
  MDB: "bg-emerald-600",
};

// Known federal deputies photo URLs from Câmara dos Deputados
const KNOWN_PHOTOS: Record<string, string> = {
  "Rubens Otoni": "https://www.camara.leg.br/internet/deputado/bandep/74371.jpgmaior.jpg",
  "Professor Alcides": "https://www.camara.leg.br/internet/deputado/bandep/204555.jpgmaior.jpg",
  "Adriana Accorsi": "https://www.camara.leg.br/internet/deputado/bandep/220641.jpgmaior.jpg",
  "Elias Vaz": "https://www.camara.leg.br/internet/deputado/bandep/220554.jpgmaior.jpg",
  "Delegado Waldir": "https://www.camara.leg.br/internet/deputado/bandep/178972.jpgmaior.jpg",
  "Flávia Morais": "https://www.camara.leg.br/internet/deputado/bandep/178928.jpgmaior.jpg",
  "Dr. Zacharias Calil": "https://www.camara.leg.br/internet/deputado/bandep/220593.jpgmaior.jpg",
  "Glaustin Fokus": "https://www.camara.leg.br/internet/deputado/bandep/204546.jpgmaior.jpg",
  "José Nelto": "https://www.camara.leg.br/internet/deputado/bandep/160631.jpgmaior.jpg",
};

function extractParty(name: string): string | null {
  const match = name.match(/\(([A-ZÇ]+)/);
  return match ? match[1] : null;
}

function extractFirstName(name: string): string {
  return name.replace(/\s*\(.*\)/, "").split("/")[0].trim();
}

function getInitials(name: string): string {
  const clean = extractFirstName(name);
  const parts = clean.split(/\s+/).filter(p => !["de", "da", "do", "dos", "das"].includes(p.toLowerCase()));
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.[0] || "?").toUpperCase();
}

function isGovernment(name: string): boolean {
  return name.startsWith("Governo ");
}

type Props = {
  parlamentarNome: string;
  className?: string;
};

export default function ParlamentarAvatar({ parlamentarNome, className = "" }: Props) {
  const party = extractParty(parlamentarNome);
  const firstName = extractFirstName(parlamentarNome);
  const initials = getInitials(parlamentarNome);
  const photoUrl = KNOWN_PHOTOS[firstName];
  const bgColor = party ? (PARTY_COLORS[party] || "bg-muted") : "bg-muted";
  const isGov = isGovernment(parlamentarNome);

  return (
    <Avatar className={`h-9 w-9 shrink-0 ${className}`}>
      {photoUrl && (
        <AvatarImage src={photoUrl} alt={firstName} className="object-cover" loading="lazy" />
      )}
      <AvatarFallback className={`${isGov ? "bg-muted" : bgColor} text-white text-xs font-bold`}>
        {isGov ? (
          parlamentarNome.includes("Federal") ? (
            <Landmark className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Building2 className="w-4 h-4 text-muted-foreground" />
          )
        ) : (
          initials
        )}
      </AvatarFallback>
    </Avatar>
  );
}
