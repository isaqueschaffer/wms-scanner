-- Migração para adicionar Tipos de Ferramentas (Modelos-Base)
CREATE TABLE IF NOT EXISTS public.tipos_ferramentas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tipos_ferramentas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_tipos_ferramentas" ON public.tipos_ferramentas FOR ALL USING (true) WITH CHECK (true);

-- Atualizar a tabela de ferramentas para referenciar o tipo
ALTER TABLE public.ferramentas 
ADD COLUMN tipo_id UUID REFERENCES public.tipos_ferramentas(id) ON DELETE RESTRICT;
