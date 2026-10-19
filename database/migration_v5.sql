-- Migração para adicionar Histórico de Ferramentas
CREATE TABLE IF NOT EXISTS public.historico_ferramentas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ferramenta_id UUID NOT NULL REFERENCES public.ferramentas(id) ON DELETE CASCADE,
  tecnico_id UUID REFERENCES public.tecnicos(id) ON DELETE SET NULL,
  acao TEXT NOT NULL, -- 'ENTREGA', 'DEVOLUCAO', 'TRANSFERENCIA', 'VERIFICACAO', 'CADASTRO'
  detalhes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.historico_ferramentas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_historico_ferramentas" ON public.historico_ferramentas FOR ALL USING (true) WITH CHECK (true);
