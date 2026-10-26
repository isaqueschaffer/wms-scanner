-- ================================================================
-- MIGRATION v9: Lixeira de equipamentos
-- Execute no SQL Editor do Supabase ANTES de publicar o front-end novo
--
-- Todo equipamento excluído de um projeto (bipe excluído, retirada pelo
-- scanner de retirada, exclusão em lote) vai para equipamentos_lixeira,
-- com o histórico de retirada por técnico, e pode voltar para a lista
-- principal com restaurar_da_lixeira().
-- ================================================================

-- 1. Lixeira
create table if not exists public.equipamentos_lixeira (
  id                 uuid primary key default gen_random_uuid(),
  equipamento_id     uuid not null,               -- id que o item tinha em equipamentos
  projeto_id         uuid not null references public.projetos(id) on delete cascade,
  ean                text not null,
  sn                 text,
  quantidade         integer not null default 1,  -- sem S/N: só as unidades retiradas
  n_patrimonio       text,
  created_at         timestamptz not null,        -- quando o item entrou no projeto
  alocacoes          jsonb not null default '[]'::jsonb, -- histórico de retirada por técnico
  removido_em        timestamptz not null default now(),
  removido_por       uuid,
  removido_por_email text
);

create index if not exists equipamentos_lixeira_projeto_idx
  on public.equipamentos_lixeira (projeto_id, removido_em desc);
create index if not exists equipamentos_lixeira_equipamento_idx
  on public.equipamentos_lixeira (equipamento_id);

alter table public.equipamentos_lixeira enable row level security;
drop policy if exists "allow_auth_equipamentos_lixeira" on public.equipamentos_lixeira;
create policy "allow_auth_equipamentos_lixeira" on public.equipamentos_lixeira
  to authenticated using (true) with check (true);

-- 2. Excluir um equipamento guarda uma cópia na lixeira
create or replace function public.mover_equipamento_para_lixeira()
returns trigger as $$
begin
  -- Exclusão em cascata (projeto apagado): a lixeira do projeto some junto, não guarda nada
  if pg_trigger_depth() > 1 then
    return old;
  end if;

  insert into public.equipamentos_lixeira
    (equipamento_id, projeto_id, ean, sn, quantidade, n_patrimonio, created_at,
     alocacoes, removido_por, removido_por_email)
  values (
    old.id, old.projeto_id, old.ean, old.sn, old.quantidade, old.n_patrimonio, old.created_at,
    coalesce(
      (select jsonb_agg(to_jsonb(a)) from public.alocacao_equipamentos a where a.equipamento_id = old.id),
      '[]'::jsonb
    ),
    auth.uid(), auth.jwt() ->> 'email'
  );
  return old;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_equipamento_para_lixeira on public.equipamentos;
create trigger trg_equipamento_para_lixeira
before delete on public.equipamentos
for each row execute function public.mover_equipamento_para_lixeira();

-- 3. Retirar quantidade de um produto sem S/N (ex.: bobina) de forma atômica:
--    tira tudo (apaga a linha) ou só parte (a linha fica com o resto).
--    Em ambos os casos o que saiu vai para a lixeira. Devolve o que sobrou no projeto.
create or replace function public.retirar_equipamento_sem_sn(
  p_projeto_id uuid,
  p_ean        text,
  p_quantidade integer
) returns integer as $$
declare
  v_row public.equipamentos;
begin
  if p_quantidade is null or p_quantidade < 1 then
    raise exception 'Quantidade deve ser maior que zero' using errcode = '23514';
  end if;

  select * into v_row
  from public.equipamentos
  where projeto_id = p_projeto_id and ean = p_ean and sn is null
  for update;

  if not found then
    raise exception 'Este produto não está no projeto' using errcode = 'P0002';
  end if;

  if p_quantidade > v_row.quantidade then
    raise exception 'O projeto tem apenas % unidade(s) deste produto', v_row.quantidade
      using errcode = '23514';
  end if;

  if p_quantidade = v_row.quantidade then
    delete from public.equipamentos where id = v_row.id; -- o gatilho guarda na lixeira
  else
    update public.equipamentos set quantidade = quantidade - p_quantidade where id = v_row.id;
    insert into public.equipamentos_lixeira
      (equipamento_id, projeto_id, ean, sn, quantidade, n_patrimonio, created_at,
       removido_por, removido_por_email)
    values (v_row.id, v_row.projeto_id, v_row.ean, null, p_quantidade, v_row.n_patrimonio, v_row.created_at,
            auth.uid(), auth.jwt() ->> 'email');
  end if;

  return v_row.quantidade - p_quantidade;
end;
$$ language plpgsql;

-- 4. Restaurar itens da lixeira para a lista principal.
--    Sem S/N: a quantidade soma na linha que o projeto já tem (ou recria a linha).
--    Com S/N: volta com o mesmo id e o histórico de técnico; falha se o S/N já foi cadastrado de novo.
--    Cada item é tratado à parte: um que falha não impede os outros.
--    Devolve { restaurados: n, falhas: [{ sn, ean, motivo }] }.
create or replace function public.restaurar_da_lixeira(p_ids uuid[])
returns jsonb as $$
declare
  t         public.equipamentos_lixeira;
  v_ok      integer := 0;
  v_falhas  jsonb := '[]'::jsonb;
  v_inseriu boolean;
begin
  for t in
    select * from public.equipamentos_lixeira where id = any(p_ids) order by removido_em
  loop
    begin
      v_inseriu := true;

      if t.sn is null then
        update public.equipamentos
          set quantidade = quantidade + t.quantidade
          where projeto_id = t.projeto_id and ean = t.ean and sn is null;
        if found then
          v_inseriu := false;
        else
          insert into public.equipamentos (id, projeto_id, ean, sn, quantidade, n_patrimonio, created_at)
          values (t.equipamento_id, t.projeto_id, t.ean, null, t.quantidade, t.n_patrimonio, t.created_at);
        end if;
      else
        insert into public.equipamentos (id, projeto_id, ean, sn, quantidade, n_patrimonio, created_at)
        values (t.equipamento_id, t.projeto_id, t.ean, t.sn, t.quantidade, t.n_patrimonio, t.created_at);
      end if;

      -- Histórico de técnico: só volta quem ainda existe (técnico) e a tarefa, se ainda houver
      if v_inseriu and jsonb_array_length(t.alocacoes) > 0 then
        insert into public.alocacao_equipamentos (id, equipamento_id, task_id, tecnico_id, data_alocacao, observacao)
        select r.id, r.equipamento_id,
               case when exists (select 1 from public.tasks k where k.id = r.task_id) then r.task_id end,
               r.tecnico_id, r.data_alocacao, r.observacao
        from jsonb_populate_recordset(null::public.alocacao_equipamentos, t.alocacoes) r
        where exists (select 1 from public.tecnicos x where x.id = r.tecnico_id)
        on conflict do nothing;
      end if;

      delete from public.equipamentos_lixeira where id = t.id;
      v_ok := v_ok + 1;
    exception when others then
      v_falhas := v_falhas || jsonb_build_object(
        'sn', t.sn,
        'ean', t.ean,
        'motivo', case sqlstate
          when '23505' then 'S/N já existe no projeto'
          when '23503' then 'produto não existe mais'
          else sqlerrm
        end
      );
    end;
  end loop;

  return jsonb_build_object('restaurados', v_ok, 'falhas', v_falhas);
end;
$$ language plpgsql;
