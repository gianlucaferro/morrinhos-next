export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token_hash: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token_hash: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token_hash?: string
        }
        Relationships: []
      }
      agro_indicadores: {
        Row: {
          ano_referencia: number
          categoria: string
          chave: string
          fonte_url: string | null
          id: string
          unidade: string | null
          updated_at: string
          valor: number | null
          valor_texto: string | null
        }
        Insert: {
          ano_referencia: number
          categoria: string
          chave: string
          fonte_url?: string | null
          id?: string
          unidade?: string | null
          updated_at?: string
          valor?: number | null
          valor_texto?: string | null
        }
        Update: {
          ano_referencia?: number
          categoria?: string
          chave?: string
          fonte_url?: string | null
          id?: string
          unidade?: string | null
          updated_at?: string
          valor?: number | null
          valor_texto?: string | null
        }
        Relationships: []
      }
      anuncios: {
        Row: {
          ativo: boolean
          cliques: number
          created_at: string
          id: string
          imagem_url: string | null
          impressoes: number
          link_destino: string | null
          nome_empresa: string
          plano: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean
          cliques?: number
          created_at?: string
          id?: string
          imagem_url?: string | null
          impressoes?: number
          link_destino?: string | null
          nome_empresa: string
          plano?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean
          cliques?: number
          created_at?: string
          id?: string
          imagem_url?: string | null
          impressoes?: number
          link_destino?: string | null
          nome_empresa?: string
          plano?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      arrecadacao_comparativo: {
        Row: {
          ano: number
          categoria: string
          fonte_nome: string
          fonte_url: string | null
          id: string
          media_go_per_capita: number | null
          media_go_valor: number | null
          municipios_amostra: number | null
          municipios_nomes: string[] | null
          morrinhos_per_capita: number | null
          morrinhos_valor: number | null
          updated_at: string
        }
        Insert: {
          ano: number
          categoria: string
          fonte_nome?: string
          fonte_url?: string | null
          id?: string
          media_go_per_capita?: number | null
          media_go_valor?: number | null
          municipios_amostra?: number | null
          municipios_nomes?: string[] | null
          morrinhos_per_capita?: number | null
          morrinhos_valor?: number | null
          updated_at?: string
        }
        Update: {
          ano?: number
          categoria?: string
          fonte_nome?: string
          fonte_url?: string | null
          id?: string
          media_go_per_capita?: number | null
          media_go_valor?: number | null
          municipios_amostra?: number | null
          municipios_nomes?: string[] | null
          morrinhos_per_capita?: number | null
          morrinhos_valor?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      arrecadacao_fontes_log: {
        Row: {
          competencia: string | null
          data_execucao: string
          fonte_nome: string
          fonte_url: string | null
          id: string
          mensagem_erro: string | null
          registros_importados: number | null
          status: string
        }
        Insert: {
          competencia?: string | null
          data_execucao?: string
          fonte_nome: string
          fonte_url?: string | null
          id?: string
          mensagem_erro?: string | null
          registros_importados?: number | null
          status?: string
        }
        Update: {
          competencia?: string | null
          data_execucao?: string
          fonte_nome?: string
          fonte_url?: string | null
          id?: string
          mensagem_erro?: string | null
          registros_importados?: number | null
          status?: string
        }
        Relationships: []
      }
      arrecadacao_municipal: {
        Row: {
          ano: number
          categoria: string
          competencia: string
          data_coleta: string
          fonte_nome: string
          fonte_url: string | null
          id: string
          municipio: string
          observacoes: string | null
          subcategoria: string | null
          tipo: string
          updated_at: string
          valor: number | null
        }
        Insert: {
          ano: number
          categoria: string
          competencia: string
          data_coleta?: string
          fonte_nome: string
          fonte_url?: string | null
          id?: string
          municipio?: string
          observacoes?: string | null
          subcategoria?: string | null
          tipo: string
          updated_at?: string
          valor?: number | null
        }
        Update: {
          ano?: number
          categoria?: string
          competencia?: string
          data_coleta?: string
          fonte_nome?: string
          fonte_url?: string | null
          id?: string
          municipio?: string
          observacoes?: string | null
          subcategoria?: string | null
          tipo?: string
          updated_at?: string
          valor?: number | null
        }
        Relationships: []
      }
      atuacao_parlamentar: {
        Row: {
          ano: number
          autor_texto: string
          autor_vereador_id: string | null
          created_at: string
          data: string
          descricao: string
          fonte_url: string
          id: string
          numero: number
          resumo: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ano: number
          autor_texto: string
          autor_vereador_id?: string | null
          created_at?: string
          data: string
          descricao: string
          fonte_url?: string
          id?: string
          numero: number
          resumo?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          ano?: number
          autor_texto?: string
          autor_vereador_id?: string | null
          created_at?: string
          data?: string
          descricao?: string
          fonte_url?: string
          id?: string
          numero?: number
          resumo?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "atuacao_parlamentar_autor_vereador_id_fkey"
            columns: ["autor_vereador_id"]
            isOneToOne: false
            referencedRelation: "vereadores"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficios_sociais: {
        Row: {
          beneficiarios: number | null
          competencia: string
          data_coleta: string
          fonte_nome: string
          fonte_url: string | null
          id: string
          municipio: string
          observacoes: string | null
          programa: string
          unidade_medida: string | null
          updated_at: string
          valor_pago: number | null
        }
        Insert: {
          beneficiarios?: number | null
          competencia: string
          data_coleta?: string
          fonte_nome: string
          fonte_url?: string | null
          id?: string
          municipio?: string
          observacoes?: string | null
          programa: string
          unidade_medida?: string | null
          updated_at?: string
          valor_pago?: number | null
        }
        Update: {
          beneficiarios?: number | null
          competencia?: string
          data_coleta?: string
          fonte_nome?: string
          fonte_url?: string | null
          id?: string
          municipio?: string
          observacoes?: string | null
          programa?: string
          unidade_medida?: string | null
          updated_at?: string
          valor_pago?: number | null
        }
        Relationships: []
      }
      camara_atos: {
        Row: {
          ano: number
          centi_id: string | null
          data_publicacao: string | null
          descricao: string | null
          documento_url: string | null
          fonte_url: string | null
          id: string
          numero: string | null
          tipo: string
          tipo_codigo: number | null
          updated_at: string
        }
        Insert: {
          ano: number
          centi_id?: string | null
          data_publicacao?: string | null
          descricao?: string | null
          documento_url?: string | null
          fonte_url?: string | null
          id?: string
          numero?: string | null
          tipo: string
          tipo_codigo?: number | null
          updated_at?: string
        }
        Update: {
          ano?: number
          centi_id?: string | null
          data_publicacao?: string | null
          descricao?: string | null
          documento_url?: string | null
          fonte_url?: string | null
          id?: string
          numero?: string | null
          tipo?: string
          tipo_codigo?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      camara_contratos: {
        Row: {
          ano: number
          centi_id: string | null
          credor: string | null
          fonte_url: string | null
          id: string
          numero: string | null
          objeto: string | null
          status: string | null
          updated_at: string
          valor: number | null
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          ano: number
          centi_id?: string | null
          credor?: string | null
          fonte_url?: string | null
          id?: string
          numero?: string | null
          objeto?: string | null
          status?: string | null
          updated_at?: string
          valor?: number | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          ano?: number
          centi_id?: string | null
          credor?: string | null
          fonte_url?: string | null
          id?: string
          numero?: string | null
          objeto?: string | null
          status?: string | null
          updated_at?: string
          valor?: number | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: []
      }
      camara_despesas: {
        Row: {
          ano: number
          centi_id: string | null
          credor: string | null
          data_pagamento: string | null
          descricao: string | null
          elemento: string | null
          fonte_url: string | null
          id: string
          mes: number | null
          updated_at: string
          valor: number | null
        }
        Insert: {
          ano: number
          centi_id?: string | null
          credor?: string | null
          data_pagamento?: string | null
          descricao?: string | null
          elemento?: string | null
          fonte_url?: string | null
          id?: string
          mes?: number | null
          updated_at?: string
          valor?: number | null
        }
        Update: {
          ano?: number
          centi_id?: string | null
          credor?: string | null
          data_pagamento?: string | null
          descricao?: string | null
          elemento?: string | null
          fonte_url?: string | null
          id?: string
          mes?: number | null
          updated_at?: string
          valor?: number | null
        }
        Relationships: []
      }
      camara_diarias: {
        Row: {
          beneficiario: string | null
          cargo: string | null
          centi_id: string | null
          data: string | null
          destino: string | null
          fonte_url: string | null
          id: string
          motivo: string | null
          updated_at: string
          valor: number | null
        }
        Insert: {
          beneficiario?: string | null
          cargo?: string | null
          centi_id?: string | null
          data?: string | null
          destino?: string | null
          fonte_url?: string | null
          id?: string
          motivo?: string | null
          updated_at?: string
          valor?: number | null
        }
        Update: {
          beneficiario?: string | null
          cargo?: string | null
          centi_id?: string | null
          data?: string | null
          destino?: string | null
          fonte_url?: string | null
          id?: string
          motivo?: string | null
          updated_at?: string
          valor?: number | null
        }
        Relationships: []
      }
      camara_licitacoes: {
        Row: {
          ano: number
          centi_id: string | null
          data_abertura: string | null
          fonte_url: string | null
          id: string
          modalidade: string | null
          numero: string | null
          objeto: string | null
          situacao: string | null
          updated_at: string
          valor_estimado: number | null
        }
        Insert: {
          ano: number
          centi_id?: string | null
          data_abertura?: string | null
          fonte_url?: string | null
          id?: string
          modalidade?: string | null
          numero?: string | null
          objeto?: string | null
          situacao?: string | null
          updated_at?: string
          valor_estimado?: number | null
        }
        Update: {
          ano?: number
          centi_id?: string | null
          data_abertura?: string | null
          fonte_url?: string | null
          id?: string
          modalidade?: string | null
          numero?: string | null
          objeto?: string | null
          situacao?: string | null
          updated_at?: string
          valor_estimado?: number | null
        }
        Relationships: []
      }
      camara_receitas: {
        Row: {
          ano: number
          descricao: string | null
          fonte_url: string | null
          id: string
          mes: number
          updated_at: string
          valor_arrecadado: number | null
          valor_previsto: number | null
        }
        Insert: {
          ano: number
          descricao?: string | null
          fonte_url?: string | null
          id?: string
          mes: number
          updated_at?: string
          valor_arrecadado?: number | null
          valor_previsto?: number | null
        }
        Update: {
          ano?: number
          descricao?: string | null
          fonte_url?: string | null
          id?: string
          mes?: number
          updated_at?: string
          valor_arrecadado?: number | null
          valor_previsto?: number | null
        }
        Relationships: []
      }
      cde_subsidios: {
        Row: {
          ano: number
          beneficiarios: number | null
          distribuidora: string
          fonte_url: string | null
          id: string
          tipo_subsidio: string
          uf: string | null
          updated_at: string
          valor_faturamento: number | null
          valor_subsidio: number | null
        }
        Insert: {
          ano: number
          beneficiarios?: number | null
          distribuidora: string
          fonte_url?: string | null
          id?: string
          tipo_subsidio: string
          uf?: string | null
          updated_at?: string
          valor_faturamento?: number | null
          valor_subsidio?: number | null
        }
        Update: {
          ano?: number
          beneficiarios?: number | null
          distribuidora?: string
          fonte_url?: string | null
          id?: string
          tipo_subsidio?: string
          uf?: string | null
          updated_at?: string
          valor_faturamento?: number | null
          valor_subsidio?: number | null
        }
        Relationships: []
      }
      classificados: {
        Row: {
          bairro: string | null
          categoria: string
          codigo_gestao: string | null
          created_at: string | null
          denuncias: number | null
          descricao: string | null
          expira_em: string | null
          foto_perfil: string | null
          fotos: string[] | null
          id: string
          nome: string
          notificado_expiracao: string | null
          preco: number | null
          preco_tipo: string | null
          status: string
          titulo: string
          updated_at: string | null
          user_id: string | null
          visualizacoes: number | null
          whatsapp: string
          whatsapp_clicks: number | null
        }
        Insert: {
          bairro?: string | null
          categoria?: string
          codigo_gestao?: string | null
          created_at?: string | null
          denuncias?: number | null
          descricao?: string | null
          expira_em?: string | null
          foto_perfil?: string | null
          fotos?: string[] | null
          id?: string
          nome: string
          notificado_expiracao?: string | null
          preco?: number | null
          preco_tipo?: string | null
          status?: string
          titulo: string
          updated_at?: string | null
          user_id?: string | null
          visualizacoes?: number | null
          whatsapp: string
          whatsapp_clicks?: number | null
        }
        Update: {
          bairro?: string | null
          categoria?: string
          codigo_gestao?: string | null
          created_at?: string | null
          denuncias?: number | null
          descricao?: string | null
          expira_em?: string | null
          foto_perfil?: string | null
          fotos?: string[] | null
          id?: string
          nome?: string
          notificado_expiracao?: string | null
          preco?: number | null
          preco_tipo?: string | null
          status?: string
          titulo?: string
          updated_at?: string | null
          user_id?: string | null
          visualizacoes?: number | null
          whatsapp?: string
          whatsapp_clicks?: number | null
        }
        Relationships: []
      }
      contas_publicas: {
        Row: {
          anexo: string
          coluna: string | null
          conta: string
          demonstrativo: string
          exercicio: number
          fonte_url: string | null
          id: string
          periodo: number | null
          updated_at: string
          valor: number | null
        }
        Insert: {
          anexo: string
          coluna?: string | null
          conta: string
          demonstrativo: string
          exercicio: number
          fonte_url?: string | null
          id?: string
          periodo?: number | null
          updated_at?: string
          valor?: number | null
        }
        Update: {
          anexo?: string
          coluna?: string | null
          conta?: string
          demonstrativo?: string
          exercicio?: number
          fonte_url?: string | null
          id?: string
          periodo?: number | null
          updated_at?: string
          valor?: number | null
        }
        Relationships: []
      }
      contratos: {
        Row: {
          empresa: string | null
          fonte_url: string | null
          id: string
          numero: string | null
          objeto: string | null
          secretaria_id: string | null
          status: string | null
          updated_at: string
          valor: number | null
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          empresa?: string | null
          fonte_url?: string | null
          id?: string
          numero?: string | null
          objeto?: string | null
          secretaria_id?: string | null
          status?: string | null
          updated_at?: string
          valor?: number | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          empresa?: string | null
          fonte_url?: string | null
          id?: string
          numero?: string | null
          objeto?: string | null
          secretaria_id?: string | null
          status?: string | null
          updated_at?: string
          valor?: number | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "secretarias"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos_aditivos: {
        Row: {
          ano: number
          centi_id: string | null
          cnpj: string | null
          contrato_numero: string
          credor: string
          data_termo: string | null
          fonte_url: string | null
          id: string
          prazo: string | null
          termo: number
          tipo: string | null
          tipo_aditivo: string | null
          updated_at: string
          valor: number | null
        }
        Insert: {
          ano: number
          centi_id?: string | null
          cnpj?: string | null
          contrato_numero: string
          credor?: string
          data_termo?: string | null
          fonte_url?: string | null
          id?: string
          prazo?: string | null
          termo?: number
          tipo?: string | null
          tipo_aditivo?: string | null
          updated_at?: string
          valor?: number | null
        }
        Update: {
          ano?: number
          centi_id?: string | null
          cnpj?: string | null
          contrato_numero?: string
          credor?: string
          data_termo?: string | null
          fonte_url?: string | null
          id?: string
          prazo?: string | null
          termo?: number
          tipo?: string | null
          tipo_aditivo?: string | null
          updated_at?: string
          valor?: number | null
        }
        Relationships: []
      }
      contratos_risco: {
        Row: {
          analisado_em: string
          contrato_id: string
          fatores: Json | null
          id: string
          modelo_versao: string | null
          orgao: string
          risco_alto: boolean
          score: number | null
          updated_at: string
        }
        Insert: {
          analisado_em?: string
          contrato_id: string
          fatores?: Json | null
          id?: string
          modelo_versao?: string | null
          orgao?: string
          risco_alto?: boolean
          score?: number | null
          updated_at?: string
        }
        Update: {
          analisado_em?: string
          contrato_id?: string
          fatores?: Json | null
          id?: string
          modelo_versao?: string | null
          orgao?: string
          risco_alto?: boolean
          score?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      decretos: {
        Row: {
          categoria: string | null
          created_at: string
          data_publicacao: string | null
          ementa: string
          fonte_url: string | null
          id: string
          numero: string
          orgao: string | null
          resumo_ia: string | null
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          data_publicacao?: string | null
          ementa: string
          fonte_url?: string | null
          id?: string
          numero: string
          orgao?: string | null
          resumo_ia?: string | null
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          data_publicacao?: string | null
          ementa?: string
          fonte_url?: string | null
          id?: string
          numero?: string
          orgao?: string | null
          resumo_ia?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      despesas: {
        Row: {
          data: string
          descricao: string | null
          favorecido: string | null
          fonte_url: string | null
          id: string
          secretaria_id: string | null
          updated_at: string
          valor: number
        }
        Insert: {
          data: string
          descricao?: string | null
          favorecido?: string | null
          fonte_url?: string | null
          id?: string
          secretaria_id?: string | null
          updated_at?: string
          valor: number
        }
        Update: {
          data?: string
          descricao?: string | null
          favorecido?: string | null
          fonte_url?: string | null
          id?: string
          secretaria_id?: string | null
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "despesas_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "secretarias"
            referencedColumns: ["id"]
          },
        ]
      }
      diarias: {
        Row: {
          data: string | null
          destino: string | null
          fonte_url: string | null
          id: string
          motivo: string | null
          servidor_id: string | null
          servidor_nome: string | null
          updated_at: string
          valor: number | null
        }
        Insert: {
          data?: string | null
          destino?: string | null
          fonte_url?: string | null
          id?: string
          motivo?: string | null
          servidor_id?: string | null
          servidor_nome?: string | null
          updated_at?: string
          valor?: number | null
        }
        Update: {
          data?: string | null
          destino?: string | null
          fonte_url?: string | null
          id?: string
          motivo?: string | null
          servidor_id?: string | null
          servidor_nome?: string | null
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "diarias_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "servidores"
            referencedColumns: ["id"]
          },
        ]
      }
      educacao_escolas: {
        Row: {
          ano_referencia: number
          codigo_inep: string | null
          diretor_nome: string | null
          endereco: string | null
          etapas: string[] | null
          fonte_url: string | null
          id: string
          ideb_af: number | null
          ideb_ai: number | null
          ideb_em: number | null
          latitude: number | null
          longitude: number | null
          matriculas_total: number | null
          nome: string
          rede: string
          taxa_abandono: number | null
          taxa_aprovacao: number | null
          taxa_reprovacao: number | null
          telefone: string | null
          tem_acessibilidade: boolean | null
          tem_alimentacao: boolean | null
          tem_biblioteca: boolean | null
          tem_internet: boolean | null
          tem_lab_ciencias: boolean | null
          tem_lab_informatica: boolean | null
          tem_quadra: boolean | null
          updated_at: string
        }
        Insert: {
          ano_referencia?: number
          codigo_inep?: string | null
          diretor_nome?: string | null
          endereco?: string | null
          etapas?: string[] | null
          fonte_url?: string | null
          id?: string
          ideb_af?: number | null
          ideb_ai?: number | null
          ideb_em?: number | null
          latitude?: number | null
          longitude?: number | null
          matriculas_total?: number | null
          nome: string
          rede: string
          taxa_abandono?: number | null
          taxa_aprovacao?: number | null
          taxa_reprovacao?: number | null
          telefone?: string | null
          tem_acessibilidade?: boolean | null
          tem_alimentacao?: boolean | null
          tem_biblioteca?: boolean | null
          tem_internet?: boolean | null
          tem_lab_ciencias?: boolean | null
          tem_lab_informatica?: boolean | null
          tem_quadra?: boolean | null
          updated_at?: string
        }
        Update: {
          ano_referencia?: number
          codigo_inep?: string | null
          diretor_nome?: string | null
          endereco?: string | null
          etapas?: string[] | null
          fonte_url?: string | null
          id?: string
          ideb_af?: number | null
          ideb_ai?: number | null
          ideb_em?: number | null
          latitude?: number | null
          longitude?: number | null
          matriculas_total?: number | null
          nome?: string
          rede?: string
          taxa_abandono?: number | null
          taxa_aprovacao?: number | null
          taxa_reprovacao?: number | null
          telefone?: string | null
          tem_acessibilidade?: boolean | null
          tem_alimentacao?: boolean | null
          tem_biblioteca?: boolean | null
          tem_internet?: boolean | null
          tem_lab_ciencias?: boolean | null
          tem_lab_informatica?: boolean | null
          tem_quadra?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      educacao_ideb: {
        Row: {
          ambito: string
          ano: number
          etapa: string
          fonte_url: string | null
          id: string
          ideb: number | null
          meta: number | null
          nota_saeb_mt: number | null
          nota_saeb_pt: number | null
          rede: string
          taxa_aprovacao: number | null
          updated_at: string
        }
        Insert: {
          ambito?: string
          ano: number
          etapa: string
          fonte_url?: string | null
          id?: string
          ideb?: number | null
          meta?: number | null
          nota_saeb_mt?: number | null
          nota_saeb_pt?: number | null
          rede?: string
          taxa_aprovacao?: number | null
          updated_at?: string
        }
        Update: {
          ambito?: string
          ano?: number
          etapa?: string
          fonte_url?: string | null
          id?: string
          ideb?: number | null
          meta?: number | null
          nota_saeb_mt?: number | null
          nota_saeb_pt?: number | null
          rede?: string
          taxa_aprovacao?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      educacao_indicadores: {
        Row: {
          ano_referencia: number
          categoria: string
          chave: string
          fonte: string | null
          fonte_url: string | null
          id: string
          updated_at: string
          valor: number | null
          valor_texto: string | null
        }
        Insert: {
          ano_referencia: number
          categoria: string
          chave: string
          fonte?: string | null
          fonte_url?: string | null
          id?: string
          updated_at?: string
          valor?: number | null
          valor_texto?: string | null
        }
        Update: {
          ano_referencia?: number
          categoria?: string
          chave?: string
          fonte?: string | null
          fonte_url?: string | null
          id?: string
          updated_at?: string
          valor?: number | null
          valor_texto?: string | null
        }
        Relationships: []
      }
      educacao_investimentos: {
        Row: {
          ano: number
          fonte_url: string | null
          fundeb: number | null
          gasto_por_aluno: number | null
          id: string
          orcamento_total: number | null
          percentual_orcamento: number | null
          updated_at: string
        }
        Insert: {
          ano: number
          fonte_url?: string | null
          fundeb?: number | null
          gasto_por_aluno?: number | null
          id?: string
          orcamento_total?: number | null
          percentual_orcamento?: number | null
          updated_at?: string
        }
        Update: {
          ano?: number
          fonte_url?: string | null
          fundeb?: number | null
          gasto_por_aluno?: number | null
          id?: string
          orcamento_total?: number | null
          percentual_orcamento?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      educacao_matriculas: {
        Row: {
          ano: number
          etapa: string
          fonte_url: string | null
          id: string
          quantidade: number
          rede: string
          updated_at: string
        }
        Insert: {
          ano: number
          etapa: string
          fonte_url?: string | null
          id?: string
          quantidade?: number
          rede?: string
          updated_at?: string
        }
        Update: {
          ano?: number
          etapa?: string
          fonte_url?: string | null
          id?: string
          quantidade?: number
          rede?: string
          updated_at?: string
        }
        Relationships: []
      }
      educacao_programas: {
        Row: {
          descricao: string | null
          esfera: string
          fonte_url: string | null
          id: string
          nome: string
          status: string | null
          updated_at: string
        }
        Insert: {
          descricao?: string | null
          esfera: string
          fonte_url?: string | null
          id?: string
          nome: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          descricao?: string | null
          esfera?: string
          fonte_url?: string | null
          id?: string
          nome?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_digest_log: {
        Row: {
          error_message: string | null
          id: string
          period_end: string
          period_start: string
          sent_at: string
          status: string
          subscription_id: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          period_end: string
          period_start: string
          sent_at?: string
          status?: string
          subscription_id: string
        }
        Update: {
          error_message?: string | null
          id?: string
          period_end?: string
          period_start?: string
          sent_at?: string
          status?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_digest_log_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      emendas_parlamentares: {
        Row: {
          ano: number
          atualizado_em: string
          fonte_url: string | null
          id: string
          objeto: string | null
          parlamentar_esfera: string | null
          parlamentar_nome: string
          valor_empenhado: number | null
          valor_pago: number | null
        }
        Insert: {
          ano: number
          atualizado_em?: string
          fonte_url?: string | null
          id?: string
          objeto?: string | null
          parlamentar_esfera?: string | null
          parlamentar_nome: string
          valor_empenhado?: number | null
          valor_pago?: number | null
        }
        Update: {
          ano?: number
          atualizado_em?: string
          fonte_url?: string | null
          id?: string
          objeto?: string | null
          parlamentar_esfera?: string | null
          parlamentar_nome?: string
          valor_empenhado?: number | null
          valor_pago?: number | null
        }
        Relationships: []
      }
      ensino_superior_cursos: {
        Row: {
          conceito_enade: number | null
          conceito_mec: number | null
          duracao_anos: number | null
          fonte_url: string | null
          grau: string
          id: string
          ies_id: string
          modalidade: string
          nome: string
          periodo: string | null
          situacao: string
          updated_at: string
          vagas_autorizadas: number | null
        }
        Insert: {
          conceito_enade?: number | null
          conceito_mec?: number | null
          duracao_anos?: number | null
          fonte_url?: string | null
          grau?: string
          id?: string
          ies_id: string
          modalidade?: string
          nome: string
          periodo?: string | null
          situacao?: string
          updated_at?: string
          vagas_autorizadas?: number | null
        }
        Update: {
          conceito_enade?: number | null
          conceito_mec?: number | null
          duracao_anos?: number | null
          fonte_url?: string | null
          grau?: string
          id?: string
          ies_id?: string
          modalidade?: string
          nome?: string
          periodo?: string | null
          situacao?: string
          updated_at?: string
          vagas_autorizadas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ensino_superior_cursos_ies_id_fkey"
            columns: ["ies_id"]
            isOneToOne: false
            referencedRelation: "ensino_superior_ies"
            referencedColumns: ["id"]
          },
        ]
      }
      ensino_superior_ies: {
        Row: {
          alunos_formados: number | null
          codigo_emec: string | null
          conceito_institucional: number | null
          docentes_mestres_doutores_pct: number | null
          email: string | null
          endereco: string | null
          facebook: string | null
          fonte_url: string | null
          fundacao_ano: number | null
          id: string
          instagram: string | null
          modalidades: string[] | null
          nome: string
          programas_financiamento: string[] | null
          sigla: string | null
          site: string | null
          telefone: string | null
          tipo: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          alunos_formados?: number | null
          codigo_emec?: string | null
          conceito_institucional?: number | null
          docentes_mestres_doutores_pct?: number | null
          email?: string | null
          endereco?: string | null
          facebook?: string | null
          fonte_url?: string | null
          fundacao_ano?: number | null
          id?: string
          instagram?: string | null
          modalidades?: string[] | null
          nome: string
          programas_financiamento?: string[] | null
          sigla?: string | null
          site?: string | null
          telefone?: string | null
          tipo?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          alunos_formados?: number | null
          codigo_emec?: string | null
          conceito_institucional?: number | null
          docentes_mestres_doutores_pct?: number | null
          email?: string | null
          endereco?: string | null
          facebook?: string | null
          fonte_url?: string | null
          fundacao_ano?: number | null
          id?: string
          instagram?: string | null
          modalidades?: string[] | null
          nome?: string
          programas_financiamento?: string[] | null
          sigla?: string | null
          site?: string | null
          telefone?: string | null
          tipo?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      executivo: {
        Row: {
          email: string | null
          endereco: string | null
          fonte_url: string
          foto_url: string | null
          horario: string | null
          id: string
          mandato_fim: string
          mandato_inicio: string
          nome: string
          partido: string | null
          telefone: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          email?: string | null
          endereco?: string | null
          fonte_url: string
          foto_url?: string | null
          horario?: string | null
          id?: string
          mandato_fim: string
          mandato_inicio: string
          nome: string
          partido?: string | null
          telefone?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          email?: string | null
          endereco?: string | null
          fonte_url?: string
          foto_url?: string | null
          horario?: string | null
          id?: string
          mandato_fim?: string
          mandato_inicio?: string
          nome?: string
          partido?: string | null
          telefone?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      farmacia_fotos: {
        Row: {
          foto_url: string
          id: string
          nome: string
          telefone: string | null
          tipo_telefone: string | null
          updated_at: string
        }
        Insert: {
          foto_url: string
          id?: string
          nome: string
          telefone?: string | null
          tipo_telefone?: string | null
          updated_at?: string
        }
        Update: {
          foto_url?: string
          id?: string
          nome?: string
          telefone?: string | null
          tipo_telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fornecedores_cnpj: {
        Row: {
          capital_social: number | null
          cep: string | null
          cnae_descricao: string | null
          cnae_principal: string | null
          cnpj: string
          consultado_em: string
          data_abertura: string | null
          email: string | null
          id: string
          logradouro: string | null
          municipio: string | null
          natureza_juridica: string | null
          nome_fantasia: string | null
          porte: string | null
          razao_social: string | null
          situacao_cadastral: string | null
          socios: Json | null
          telefone: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          capital_social?: number | null
          cep?: string | null
          cnae_descricao?: string | null
          cnae_principal?: string | null
          cnpj: string
          consultado_em?: string
          data_abertura?: string | null
          email?: string | null
          id?: string
          logradouro?: string | null
          municipio?: string | null
          natureza_juridica?: string | null
          nome_fantasia?: string | null
          porte?: string | null
          razao_social?: string | null
          situacao_cadastral?: string | null
          socios?: Json | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          capital_social?: number | null
          cep?: string | null
          cnae_descricao?: string | null
          cnae_principal?: string | null
          cnpj?: string
          consultado_em?: string
          data_abertura?: string | null
          email?: string | null
          id?: string
          logradouro?: string | null
          municipio?: string | null
          natureza_juridica?: string | null
          nome_fantasia?: string | null
          porte?: string | null
          razao_social?: string | null
          situacao_cadastral?: string | null
          socios?: Json | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      indicadores_municipais: {
        Row: {
          ano_referencia: number
          atualizado_em: string
          chave: string
          fonte_url: string | null
          id: string
          valor: number | null
          valor_texto: string | null
        }
        Insert: {
          ano_referencia: number
          atualizado_em?: string
          chave: string
          fonte_url?: string | null
          id?: string
          valor?: number | null
          valor_texto?: string | null
        }
        Update: {
          ano_referencia?: number
          atualizado_em?: string
          chave?: string
          fonte_url?: string | null
          id?: string
          valor?: number | null
          valor_texto?: string | null
        }
        Relationships: []
      }
      lei_organica: {
        Row: {
          created_at: string
          data_publicacao: string | null
          descricao: string
          documento_url: string | null
          id: string
          observacao: string | null
          resumo_ia: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_publicacao?: string | null
          descricao: string
          documento_url?: string | null
          id?: string
          observacao?: string | null
          resumo_ia?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_publicacao?: string | null
          descricao?: string
          documento_url?: string | null
          id?: string
          observacao?: string | null
          resumo_ia?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lei_organica_artigos: {
        Row: {
          artigo_numero: number | null
          artigo_texto: string
          capitulo: string | null
          created_at: string
          id: string
          ordem: number
          resumo_ia: string | null
          secao: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          artigo_numero?: number | null
          artigo_texto: string
          capitulo?: string | null
          created_at?: string
          id?: string
          ordem?: number
          resumo_ia?: string | null
          secao?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          artigo_numero?: number | null
          artigo_texto?: string
          capitulo?: string | null
          created_at?: string
          id?: string
          ordem?: number
          resumo_ia?: string | null
          secao?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      leis_municipais: {
        Row: {
          categoria: string | null
          created_at: string
          data_publicacao: string | null
          ementa: string
          fonte_url: string | null
          id: string
          numero: string
          orgao: string | null
          resumo_ia: string | null
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          data_publicacao?: string | null
          ementa: string
          fonte_url?: string | null
          id?: string
          numero: string
          orgao?: string | null
          resumo_ia?: string | null
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          data_publicacao?: string | null
          ementa?: string
          fonte_url?: string | null
          id?: string
          numero?: string
          orgao?: string | null
          resumo_ia?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      licitacoes: {
        Row: {
          data_publicacao: string | null
          data_resultado: string | null
          fonte_url: string | null
          id: string
          modalidade: string | null
          numero: string | null
          objeto: string | null
          secretaria_id: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          data_publicacao?: string | null
          data_resultado?: string | null
          fonte_url?: string | null
          id?: string
          modalidade?: string | null
          numero?: string | null
          objeto?: string | null
          secretaria_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          data_publicacao?: string | null
          data_resultado?: string | null
          fonte_url?: string | null
          id?: string
          modalidade?: string | null
          numero?: string | null
          objeto?: string | null
          secretaria_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "licitacoes_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "secretarias"
            referencedColumns: ["id"]
          },
        ]
      }
      noticias: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          link: string
          origem: string
          pub_date: string | null
          source: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          link: string
          origem?: string
          pub_date?: string | null
          source?: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          link?: string
          origem?: string
          pub_date?: string | null
          source?: string
          title?: string
        }
        Relationships: []
      }
      obras: {
        Row: {
          empresa: string | null
          fonte_url: string | null
          id: string
          local: string | null
          nome: string
          status: string | null
          updated_at: string
          valor: number | null
        }
        Insert: {
          empresa?: string | null
          fonte_url?: string | null
          id?: string
          local?: string | null
          nome: string
          status?: string | null
          updated_at?: string
          valor?: number | null
        }
        Update: {
          empresa?: string | null
          fonte_url?: string | null
          id?: string
          local?: string | null
          nome?: string
          status?: string | null
          updated_at?: string
          valor?: number | null
        }
        Relationships: []
      }
      pe_de_meia: {
        Row: {
          ano: number
          beneficiarios: number | null
          fonte_url: string | null
          id: string
          mes: number | null
          observacao: string | null
          serie: string | null
          updated_at: string
          valor_medio_por_aluno: number | null
          valor_total: number | null
        }
        Insert: {
          ano: number
          beneficiarios?: number | null
          fonte_url?: string | null
          id?: string
          mes?: number | null
          observacao?: string | null
          serie?: string | null
          updated_at?: string
          valor_medio_por_aluno?: number | null
          valor_total?: number | null
        }
        Update: {
          ano?: number
          beneficiarios?: number | null
          fonte_url?: string | null
          id?: string
          mes?: number | null
          observacao?: string | null
          serie?: string | null
          updated_at?: string
          valor_medio_por_aluno?: number | null
          valor_total?: number | null
        }
        Relationships: []
      }
      portarias: {
        Row: {
          categoria: string | null
          created_at: string
          data_publicacao: string | null
          ementa: string
          fonte_url: string | null
          id: string
          numero: string
          orgao: string | null
          resumo_ia: string | null
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          data_publicacao?: string | null
          ementa: string
          fonte_url?: string | null
          id?: string
          numero: string
          orgao?: string | null
          resumo_ia?: string | null
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          data_publicacao?: string | null
          ementa?: string
          fonte_url?: string | null
          id?: string
          numero?: string
          orgao?: string | null
          resumo_ia?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      presenca_sessoes: {
        Row: {
          ano: number
          ata_url: string | null
          fonte_tipo: string | null
          fonte_url: string | null
          id: string
          presente: boolean | null
          sessao_data: string | null
          sessao_titulo: string
          status_verificacao: string | null
          tipo_sessao: string | null
          updated_at: string
          vereador_id: string | null
          vereador_nome: string | null
          wp_post_id: number | null
        }
        Insert: {
          ano: number
          ata_url?: string | null
          fonte_tipo?: string | null
          fonte_url?: string | null
          id?: string
          presente?: boolean | null
          sessao_data?: string | null
          sessao_titulo: string
          status_verificacao?: string | null
          tipo_sessao?: string | null
          updated_at?: string
          vereador_id?: string | null
          vereador_nome?: string | null
          wp_post_id?: number | null
        }
        Update: {
          ano?: number
          ata_url?: string | null
          fonte_tipo?: string | null
          fonte_url?: string | null
          id?: string
          presente?: boolean | null
          sessao_data?: string | null
          sessao_titulo?: string
          status_verificacao?: string | null
          tipo_sessao?: string | null
          updated_at?: string
          vereador_id?: string | null
          vereador_nome?: string | null
          wp_post_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "presenca_sessoes_vereador_id_fkey"
            columns: ["vereador_id"]
            isOneToOne: false
            referencedRelation: "vereadores"
            referencedColumns: ["id"]
          },
        ]
      }
      projetos: {
        Row: {
          ano: number
          autor_texto: string
          autor_vereador_id: string | null
          created_at: string
          data: string
          ementa: string
          fonte_download_url: string | null
          fonte_visualizar_url: string
          id: string
          numero: string
          origem: string
          resumo_simples: string | null
          status: string
          tags: string[] | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ano: number
          autor_texto: string
          autor_vereador_id?: string | null
          created_at?: string
          data: string
          ementa: string
          fonte_download_url?: string | null
          fonte_visualizar_url: string
          id?: string
          numero: string
          origem: string
          resumo_simples?: string | null
          status?: string
          tags?: string[] | null
          tipo: string
          updated_at?: string
        }
        Update: {
          ano?: number
          autor_texto?: string
          autor_vereador_id?: string | null
          created_at?: string
          data?: string
          ementa?: string
          fonte_download_url?: string | null
          fonte_visualizar_url?: string
          id?: string
          numero?: string
          origem?: string
          resumo_simples?: string | null
          status?: string
          tags?: string[] | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projetos_autor_vereador_id_fkey"
            columns: ["autor_vereador_id"]
            isOneToOne: false
            referencedRelation: "vereadores"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          keys_auth: string
          keys_p256dh: string
          topic: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          keys_auth: string
          keys_p256dh: string
          topic?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          keys_auth?: string
          keys_p256dh?: string
          topic?: string
        }
        Relationships: []
      }
      remuneracao_mensal: {
        Row: {
          bruto: number | null
          competencia: string
          fonte_url: string
          id: string
          liquido: number | null
          subsidio_referencia: number
          updated_at: string
          vereador_id: string
        }
        Insert: {
          bruto?: number | null
          competencia: string
          fonte_url: string
          id?: string
          liquido?: number | null
          subsidio_referencia: number
          updated_at?: string
          vereador_id: string
        }
        Update: {
          bruto?: number | null
          competencia?: string
          fonte_url?: string
          id?: string
          liquido?: number | null
          subsidio_referencia?: number
          updated_at?: string
          vereador_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "remuneracao_mensal_vereador_id_fkey"
            columns: ["vereador_id"]
            isOneToOne: false
            referencedRelation: "vereadores"
            referencedColumns: ["id"]
          },
        ]
      }
      remuneracao_servidores: {
        Row: {
          bruto: number | null
          competencia: string
          fonte_url: string | null
          id: string
          liquido: number | null
          servidor_id: string
          tipo_folha: string | null
          updated_at: string
        }
        Insert: {
          bruto?: number | null
          competencia: string
          fonte_url?: string | null
          id?: string
          liquido?: number | null
          servidor_id: string
          tipo_folha?: string | null
          updated_at?: string
        }
        Update: {
          bruto?: number | null
          competencia?: string
          fonte_url?: string | null
          id?: string
          liquido?: number | null
          servidor_id?: string
          tipo_folha?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "remuneracao_servidores_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "servidores"
            referencedColumns: ["id"]
          },
        ]
      }
      resolucoes: {
        Row: {
          ano: number
          categoria: string | null
          created_at: string
          data_publicacao: string | null
          ementa: string
          fonte_url: string | null
          id: string
          numero: string
          orgao: string | null
          resumo_ia: string | null
          updated_at: string
        }
        Insert: {
          ano: number
          categoria?: string | null
          created_at?: string
          data_publicacao?: string | null
          ementa: string
          fonte_url?: string | null
          id?: string
          numero: string
          orgao?: string | null
          resumo_ia?: string | null
          updated_at?: string
        }
        Update: {
          ano?: number
          categoria?: string | null
          created_at?: string
          data_publicacao?: string | null
          ementa?: string
          fonte_url?: string | null
          id?: string
          numero?: string
          orgao?: string | null
          resumo_ia?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      resumos_ia_cache: {
        Row: {
          ano: number
          chave: string
          contexto: string
          created_at: string
          id: string
          resumo: string
        }
        Insert: {
          ano: number
          chave: string
          contexto: string
          created_at?: string
          id?: string
          resumo: string
        }
        Update: {
          ano?: number
          chave?: string
          contexto?: string
          created_at?: string
          id?: string
          resumo?: string
        }
        Relationships: []
      }
      saude_equipes: {
        Row: {
          area: string | null
          ativa: boolean | null
          fonte_url: string | null
          id: string
          nome: string | null
          profissionais: Json | null
          tipo: string
          unidade: string | null
          updated_at: string
        }
        Insert: {
          area?: string | null
          ativa?: boolean | null
          fonte_url?: string | null
          id?: string
          nome?: string | null
          profissionais?: Json | null
          tipo: string
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          area?: string | null
          ativa?: boolean | null
          fonte_url?: string | null
          id?: string
          nome?: string | null
          profissionais?: Json | null
          tipo?: string
          unidade?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      saude_estabelecimentos: {
        Row: {
          cnes: string
          endereco: string | null
          fonte_url: string | null
          id: string
          latitude: number | null
          leitos_count: number | null
          longitude: number | null
          nome: string
          profissionais_count: number | null
          telefone: string | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          cnes: string
          endereco?: string | null
          fonte_url?: string | null
          id?: string
          latitude?: number | null
          leitos_count?: number | null
          longitude?: number | null
          nome: string
          profissionais_count?: number | null
          telefone?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          cnes?: string
          endereco?: string | null
          fonte_url?: string | null
          id?: string
          latitude?: number | null
          leitos_count?: number | null
          longitude?: number | null
          nome?: string
          profissionais_count?: number | null
          telefone?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      saude_indicadores: {
        Row: {
          ano: number
          categoria: string
          fonte: string | null
          fonte_url: string | null
          id: string
          indicador: string
          mes: number | null
          semana_epidemiologica: number | null
          updated_at: string
          valor: number | null
          valor_texto: string | null
        }
        Insert: {
          ano: number
          categoria: string
          fonte?: string | null
          fonte_url?: string | null
          id?: string
          indicador: string
          mes?: number | null
          semana_epidemiologica?: number | null
          updated_at?: string
          valor?: number | null
          valor_texto?: string | null
        }
        Update: {
          ano?: number
          categoria?: string
          fonte?: string | null
          fonte_url?: string | null
          id?: string
          indicador?: string
          mes?: number | null
          semana_epidemiologica?: number | null
          updated_at?: string
          valor?: number | null
          valor_texto?: string | null
        }
        Relationships: []
      }
      saude_repasses: {
        Row: {
          ano: number
          bloco: string
          componente: string | null
          fonte_url: string | null
          id: string
          mes: number
          updated_at: string
          valor: number
        }
        Insert: {
          ano: number
          bloco: string
          componente?: string | null
          fonte_url?: string | null
          id?: string
          mes: number
          updated_at?: string
          valor?: number
        }
        Update: {
          ano?: number
          bloco?: string
          componente?: string | null
          fonte_url?: string | null
          id?: string
          mes?: number
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      secretarias: {
        Row: {
          contato: string | null
          email: string | null
          fonte_url: string | null
          foto_url: string | null
          id: string
          nome: string
          secretario_nome: string | null
          subsidio: number | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          contato?: string | null
          email?: string | null
          fonte_url?: string | null
          foto_url?: string | null
          id?: string
          nome: string
          secretario_nome?: string | null
          subsidio?: number | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          contato?: string | null
          email?: string | null
          fonte_url?: string | null
          foto_url?: string | null
          id?: string
          nome?: string
          secretario_nome?: string | null
          subsidio?: number | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      seguranca_indicadores: {
        Row: {
          ano: number
          categoria: string
          fonte_nome: string
          fonte_url: string | null
          id: string
          indicador: string
          mes: number | null
          municipio: string
          ocorrencias: number | null
          taxa_por_100k: number | null
          uf: string
          updated_at: string
          vitimas: number | null
        }
        Insert: {
          ano: number
          categoria?: string
          fonte_nome?: string
          fonte_url?: string | null
          id?: string
          indicador: string
          mes?: number | null
          municipio?: string
          ocorrencias?: number | null
          taxa_por_100k?: number | null
          uf?: string
          updated_at?: string
          vitimas?: number | null
        }
        Update: {
          ano?: number
          categoria?: string
          fonte_nome?: string
          fonte_url?: string | null
          id?: string
          indicador?: string
          mes?: number | null
          municipio?: string
          ocorrencias?: number | null
          taxa_por_100k?: number | null
          uf?: string
          updated_at?: string
          vitimas?: number | null
        }
        Relationships: []
      }
      servidores: {
        Row: {
          cargo: string | null
          fonte_url: string | null
          id: string
          nome: string
          orgao_tipo: string
          secretaria_id: string | null
          updated_at: string
        }
        Insert: {
          cargo?: string | null
          fonte_url?: string | null
          id?: string
          nome: string
          orgao_tipo?: string
          secretaria_id?: string | null
          updated_at?: string
        }
        Update: {
          cargo?: string | null
          fonte_url?: string | null
          id?: string
          nome?: string
          orgao_tipo?: string
          secretaria_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "servidores_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "secretarias"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_vereadores: {
        Row: {
          created_at: string
          id: string
          subscription_id: string
          vereador_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          subscription_id: string
          vereador_id: string
        }
        Update: {
          created_at?: string
          id?: string
          subscription_id?: string
          vereador_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_vereadores_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_vereadores_vereador_id_fkey"
            columns: ["vereador_id"]
            isOneToOne: false
            referencedRelation: "vereadores"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          email: string
          id: string
          is_paused: boolean
          is_verified: boolean
          verified_at: string | null
          verify_token_hash: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_paused?: boolean
          is_verified?: boolean
          verified_at?: string | null
          verify_token_hash?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_paused?: boolean
          is_verified?: boolean
          verified_at?: string | null
          verify_token_hash?: string | null
        }
        Relationships: []
      }
      sync_job_registry: {
        Row: {
          created_at: string
          cron_expression: string
          cron_name: string
          data_source: string
          depends_on: string[] | null
          description_pt: string | null
          frequency_tier: string
          function_name: string
          id: string
          is_active: boolean
          max_stale_hours: number
        }
        Insert: {
          created_at?: string
          cron_expression: string
          cron_name: string
          data_source: string
          depends_on?: string[] | null
          description_pt?: string | null
          frequency_tier: string
          function_name: string
          id?: string
          is_active?: boolean
          max_stale_hours?: number
        }
        Update: {
          created_at?: string
          cron_expression?: string
          cron_name?: string
          data_source?: string
          depends_on?: string[] | null
          description_pt?: string | null
          frequency_tier?: string
          function_name?: string
          id?: string
          is_active?: boolean
          max_stale_hours?: number
        }
        Relationships: []
      }
      sync_log: {
        Row: {
          detalhes: Json | null
          finished_at: string | null
          id: string
          started_at: string
          status: string
          tipo: string
        }
        Insert: {
          detalhes?: Json | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          tipo: string
        }
        Update: {
          detalhes?: Json | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          tipo?: string
        }
        Relationships: []
      }
      transferencias_federais: {
        Row: {
          ano: number
          data_fim: string | null
          data_inicio: string | null
          fonte_api: string | null
          fonte_url: string | null
          id: string
          numero: string | null
          objeto: string | null
          orgao_concedente: string | null
          portal_id: string | null
          situacao: string | null
          tipo: string
          updated_at: string
          valor_empenhado: number | null
          valor_liberado: number | null
          valor_total: number | null
        }
        Insert: {
          ano: number
          data_fim?: string | null
          data_inicio?: string | null
          fonte_api?: string | null
          fonte_url?: string | null
          id?: string
          numero?: string | null
          objeto?: string | null
          orgao_concedente?: string | null
          portal_id?: string | null
          situacao?: string | null
          tipo?: string
          updated_at?: string
          valor_empenhado?: number | null
          valor_liberado?: number | null
          valor_total?: number | null
        }
        Update: {
          ano?: number
          data_fim?: string | null
          data_inicio?: string | null
          fonte_api?: string | null
          fonte_url?: string | null
          id?: string
          numero?: string | null
          objeto?: string | null
          orgao_concedente?: string | null
          portal_id?: string | null
          situacao?: string | null
          tipo?: string
          updated_at?: string
          valor_empenhado?: number | null
          valor_liberado?: number | null
          valor_total?: number | null
        }
        Relationships: []
      }
      veiculos_frota: {
        Row: {
          ano_fabricacao: string | null
          ano_modelo: string | null
          atualizado_em: string
          categoria: string
          centi_id: string | null
          combustivel: string
          descricao: string
          fonte_url: string
          id: string
          marca: string
          orgao: string
          placa: string
          situacao: string
        }
        Insert: {
          ano_fabricacao?: string | null
          ano_modelo?: string | null
          atualizado_em?: string
          categoria?: string
          centi_id?: string | null
          combustivel?: string
          descricao?: string
          fonte_url?: string
          id?: string
          marca?: string
          orgao?: string
          placa: string
          situacao?: string
        }
        Update: {
          ano_fabricacao?: string | null
          ano_modelo?: string | null
          atualizado_em?: string
          categoria?: string
          centi_id?: string | null
          combustivel?: string
          descricao?: string
          fonte_url?: string
          id?: string
          marca?: string
          orgao?: string
          placa?: string
          situacao?: string
        }
        Relationships: []
      }
      vereadores: {
        Row: {
          ano_eleicao: number | null
          cargo_mesa: string | null
          created_at: string
          email: string | null
          fim_mandato: string
          fonte_url: string
          foto_url: string | null
          id: string
          inicio_mandato: string
          instagram: string | null
          nome: string
          partido: string | null
          slug: string
          telefone: string | null
          updated_at: string
          votos_eleicao: number | null
        }
        Insert: {
          ano_eleicao?: number | null
          cargo_mesa?: string | null
          created_at?: string
          email?: string | null
          fim_mandato: string
          fonte_url: string
          foto_url?: string | null
          id?: string
          inicio_mandato: string
          instagram?: string | null
          nome: string
          partido?: string | null
          slug: string
          telefone?: string | null
          updated_at?: string
          votos_eleicao?: number | null
        }
        Update: {
          ano_eleicao?: number | null
          cargo_mesa?: string | null
          created_at?: string
          email?: string | null
          fim_mandato?: string
          fonte_url?: string
          foto_url?: string | null
          id?: string
          inicio_mandato?: string
          instagram?: string | null
          nome?: string
          partido?: string | null
          slug?: string
          telefone?: string | null
          updated_at?: string
          votos_eleicao?: number | null
        }
        Relationships: []
      }
      votacoes: {
        Row: {
          created_at: string
          data: string
          fonte_url: string
          id: string
          projeto_id: string
          resultado: string
        }
        Insert: {
          created_at?: string
          data: string
          fonte_url: string
          id?: string
          projeto_id: string
          resultado: string
        }
        Update: {
          created_at?: string
          data?: string
          fonte_url?: string
          id?: string
          projeto_id?: string
          resultado?: string
        }
        Relationships: [
          {
            foreignKeyName: "votacoes_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      zap_backups: {
        Row: {
          created_at: string
          id: string
          snapshot: Json
          total_records: number
        }
        Insert: {
          created_at?: string
          id?: string
          snapshot?: Json
          total_records?: number
        }
        Update: {
          created_at?: string
          id?: string
          snapshot?: Json
          total_records?: number
        }
        Relationships: []
      }
      zap_establishments: {
        Row: {
          category: string | null
          click_count: number
          created_at: string
          id: string
          name: string
          status: string
          whatsapp: string
        }
        Insert: {
          category?: string | null
          click_count?: number
          created_at?: string
          id?: string
          name: string
          status?: string
          whatsapp: string
        }
        Update: {
          category?: string | null
          click_count?: number
          created_at?: string
          id?: string
          name?: string
          status?: string
          whatsapp?: string
        }
        Relationships: []
      }
      zap_suggestions: {
        Row: {
          created_at: string
          establishment_id: string
          id: string
          suggestion_text: string
        }
        Insert: {
          created_at?: string
          establishment_id: string
          id?: string
          suggestion_text: string
        }
        Update: {
          created_at?: string
          establishment_id?: string
          id?: string
          suggestion_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "zap_suggestions_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "zap_establishments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_sync_dashboard: {
        Row: {
          cron_expression: string | null
          data_source: string | null
          description_pt: string | null
          duration_seconds: number | null
          errors_7d: number | null
          frequency_tier: string | null
          function_name: string | null
          health_status: string | null
          is_active: boolean | null
          last_finished_at: string | null
          last_started_at: string | null
          last_status: string | null
          max_stale_hours: number | null
          partials_7d: number | null
          runs_7d: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      denunciar_classificado: {
        Args: { classificado_id: string }
        Returns: undefined
      }
      increment_anuncio_clique: {
        Args: { anuncio_id: string }
        Returns: undefined
      }
      increment_anuncio_impressao: {
        Args: { anuncio_id: string }
        Returns: undefined
      }
      increment_classificado_view: {
        Args: { classificado_id: string }
        Returns: undefined
      }
      increment_click_count: {
        Args: { establishment_id: string }
        Returns: undefined
      }
      invoke_edge_function: { Args: { function_name: string }; Returns: number }
      retry_failed_syncs: {
        Args: { max_retries?: number }
        Returns: {
          function_name: string
          retry_triggered: boolean
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
