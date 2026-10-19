-- ================================================================
-- MIGRATION v6: Performance da bipagem e validação de S/N
-- Execute no SQL Editor do Supabase
-- ================================================================

-- 1. Índices para acelerar listagens e joins
-- Listagem de equipamentos do projeto ordenada por data
create index if not exists equipamentos_projeto_created_idx
  on public.equipamentos (projeto_id, created_at desc);

-- Relatórios por produto
create index if not exists equipamentos_ean_idx
  on public.equipamentos (ean);

-- Join equipamentos -> alocacao_equipamentos (sem índice, cada linha varre a tabela)
create index if not exists alocacao_equipamentos_equipamento_idx
  on public.alocacao_equipamentos (equipamento_id);

-- Tela de auditoria ordena por data
create index if not exists logs_auditoria_criado_em_idx
  on public.logs_auditoria (criado_em desc);

-- Busca de produtos por nome
create index if not exists produtos_nome_idx
  on public.produtos (nome);

-- 2. Validação do S/N direto no banco (última barreira, vale para qualquer tela)
--    - remove espaços nas pontas
--    - não aceita S/N vazio
--    - não aceita S/N igual ao EAN de algum produto (leitura trocada)
create or replace function public.validar_sn_equipamento()
returns trigger as $$
begin
  new.sn := btrim(new.sn);

  if new.sn = '' then
    raise exception 'S/N não pode ser vazio';
  end if;

  if exists (select 1 from public.produtos p where p.ean = new.sn) then
    raise exception 'S/N inválido: "%" é o EAN de um produto (leitura trocada)', new.sn
      using errcode = '23514';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_validar_sn_equipamento on public.equipamentos;
create trigger trg_validar_sn_equipamento
before insert or update of sn on public.equipamentos
for each row execute function public.validar_sn_equipamento();

-- 3. Atualizar estatísticas do planner
analyze public.equipamentos;
analyze public.alocacao_equipamentos;
