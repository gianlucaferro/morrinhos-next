// Glossário de termos técnicos para tooltips em linguagem acessível
export const GLOSSARIO: Record<string, string> = {
  // Licitações
  "Pregão Eletrônico": "Compra feita pela internet onde várias empresas disputam quem oferece o menor preço.",
  "Pregão Presencial": "Compra feita presencialmente onde empresas disputam o menor preço.",
  "Dispensa de Licitação": "Compra feita sem concorrência, permitida por lei para valores baixos ou emergências.",
  "Inexigibilidade": "Quando só existe um fornecedor possível, não precisa de concorrência.",
  "Tomada de Preços": "Concorrência entre empresas já cadastradas no município.",
  "Carta Convite": "Concorrência simplificada com pelo menos 3 empresas convidadas.",
  "Concorrência": "Tipo mais amplo de licitação, aberto a qualquer empresa interessada.",

  // Despesas - Elementos
  "339039": "Material de consumo (papel, combustível, material de limpeza, etc.)",
  "339036": "Serviços de terceiros (manutenção, consultoria, limpeza, etc.)",
  "339014": "Diárias (pagamento por deslocamento a serviço)",
  "339030": "Material de consumo",
  "339033": "Passagens e despesas com locomoção",
  "339035": "Serviços de consultoria",
  "339046": "Auxílio-alimentação",
  "339047": "Obrigações tributárias e contributivas",
  "339092": "Despesas de exercícios anteriores",
  "449052": "Equipamentos e material permanente",

  // Contratos
  "Ativo": "Contrato em vigor, com obrigações sendo cumpridas.",
  "Encerrado": "Contrato que terminou no prazo previsto.",
  "Rescindido": "Contrato cancelado antes do prazo, por decisão de uma das partes.",
  "Aditivo": "Alteração no contrato original (prazo, valor ou condições).",

  // Atuação parlamentar
  "Indicação": "Sugestão do vereador ao prefeito para melhorias na cidade (ex: consertar rua, instalar iluminação).",
  "Requerimento": "Pedido formal do vereador à Câmara (ex: convocar secretário, solicitar informações).",
  "Moção": "Manifestação da Câmara sobre um assunto (homenagem, apoio, repúdio).",
  "Projeto de Lei": "Proposta de nova lei municipal que precisa ser votada e aprovada.",
  "Decreto Legislativo": "Decisão da Câmara que não precisa de aprovação do prefeito.",
  "Resolução": "Norma interna da Câmara sobre seu próprio funcionamento.",
};

export function getTooltip(term: string): string | null {
  // Try exact match first
  if (GLOSSARIO[term]) return GLOSSARIO[term];
  // Try case-insensitive
  const key = Object.keys(GLOSSARIO).find((k) => k.toLowerCase() === term.toLowerCase());
  return key ? GLOSSARIO[key] : null;
}
