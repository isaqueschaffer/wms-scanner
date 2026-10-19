-- Migração para adicionar Identificador único nas Ferramentas
ALTER TABLE public.ferramentas 
ADD COLUMN identificador text;
