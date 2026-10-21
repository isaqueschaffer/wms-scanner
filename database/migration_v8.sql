-- ================================================================
-- MIGRATION v8: Produtos sem S/N (ex.: bobina) controlados por quantidade
-- Execute no SQL Editor do Supabase ANTES de publicar o front-end novo
--
-- Modelo: produtos.controla_sn = false  →  o projeto guarda UMA linha por
-- produto em equipamentos (sn nulo) e a coluna quantidade diz quantas unidades.
-- Produtos com S/N continuam com uma linha por serial (quantidade = 1).
-- ================================================================

-- 1. Produto: controla número de série?
alter table public.produtos
  add column if not exists controla_sn boolean not null default true;

-- 2. Equipamentos: quantidade e S/N opcional
alter table public.equipamentos
  add column if not exists quantidade integer not null default 1;

alter table public.equipamentos
  alter column sn drop not null;

alter table public.equipamentos
  drop constraint if exists equipamentos_quantidade_check;
alter table public.equipamentos
  add constraint equipamentos_quantidade_check check (quantidade >= 1);

-- Item com S/N é sempre unitário; só item sem S/N pode ter quantidade > 1
alter table public.equipamentos
  drop constraint if exists equipamentos_sn_quantidade_check;
alter table public.equipamentos
  add constraint equipamentos_sn_quantidade_check check (sn is null or quantidade = 1);

-- No máximo uma linha sem S/N por produto em cada projeto (a quantidade soma)
create unique index if not exists equipamentos_projeto_ean_sem_sn_unique
  on public.equipamentos (projeto_id, ean) where sn is null;

-- 3. Validação no banco: S/N só pode faltar em produto que não controla S/N
create or replace function public.validar_sn_equipamento()
returns trigger as $$
begin
  if new.sn is null then
    if exists (select 1 from public.produtos p where p.ean = new.ean and p.controla_sn) then
      raise exception 'Este produto exige número de série (S/N)'
        using errcode = '23514';
    end if;
    return new;
  end if;

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
before insert or update of sn, ean on public.equipamentos
for each row execute function public.validar_sn_equipamento();

-- 4. Adicionar quantidade a um produto sem S/N de forma atômica:
--    cria a linha do projeto ou soma na que já existe.
create or replace function public.adicionar_equipamento_sem_sn(
  p_projeto_id uuid,
  p_ean        text,
  p_quantidade integer,
  p_patrimonio text default null
) returns public.equipamentos as $$
declare
  v_row public.equipamentos;
begin
  if p_quantidade is null or p_quantidade < 1 then
    raise exception 'Quantidade deve ser maior que zero' using errcode = '23514';
  end if;

  insert into public.equipamentos (projeto_id, ean, sn, quantidade, n_patrimonio)
  values (p_projeto_id, p_ean, null, p_quantidade, nullif(btrim(p_patrimonio), ''))
  on conflict (projeto_id, ean) where sn is null
  do update set quantidade = public.equipamentos.quantidade + excluded.quantidade
  returning * into v_row;

  return v_row;
end;
$$ language plpgsql;
