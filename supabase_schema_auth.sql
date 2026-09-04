-- 1. Criar a tabela de Logs de Auditoria
create table if not exists public.logs_auditoria (
  id uuid primary key default gen_random_uuid(),
  tabela text not null,
  acao text not null, -- 'INSERT', 'UPDATE', 'DELETE'
  registro_id text not null,
  usuario_id uuid, -- ID do usuário (auth.uid)
  usuario_email text, -- Email extraído do JWT
  dados_anteriores jsonb,
  dados_novos jsonb,
  criado_em timestamptz not null default now()
);

-- Habilitar RLS na tabela de logs (Apenas leitura para usuários autenticados)
alter table public.logs_auditoria enable row level security;
create policy "Usuarios autenticados podem ver logs" 
  on public.logs_auditoria for select 
  to authenticated 
  using (true);

-- 2. Função genérica de auditoria (Gatilho)
create or replace function public.log_auditoria_trigger()
returns trigger as $$
declare
  v_user_id uuid;
  v_user_email text;
  v_record_id text;
begin
  -- Obter dados do usuário logado via Supabase Auth
  v_user_id := auth.uid();
  v_user_email := auth.jwt() ->> 'email';

  -- Determinar o ID do registro dependendo da tabela
  -- Produtos usam EAN como PK, as outras usam ID
  if TG_TABLE_NAME = 'produtos' then
    if TG_OP = 'DELETE' then
      v_record_id := OLD.ean::text;
    else
      v_record_id := NEW.ean::text;
    end if;
  else
    if TG_OP = 'DELETE' then
      v_record_id := OLD.id::text;
    else
      v_record_id := NEW.id::text;
    end if;
  end if;

  -- Inserir o log na tabela
  if TG_OP = 'INSERT' then
    insert into public.logs_auditoria (tabela, acao, registro_id, usuario_id, usuario_email, dados_novos)
    values (TG_TABLE_NAME, TG_OP, v_record_id, v_user_id, v_user_email, row_to_json(NEW));
    return NEW;
  elsif TG_OP = 'UPDATE' then
    insert into public.logs_auditoria (tabela, acao, registro_id, usuario_id, usuario_email, dados_anteriores, dados_novos)
    values (TG_TABLE_NAME, TG_OP, v_record_id, v_user_id, v_user_email, row_to_json(OLD), row_to_json(NEW));
    return NEW;
  elsif TG_OP = 'DELETE' then
    insert into public.logs_auditoria (tabela, acao, registro_id, usuario_id, usuario_email, dados_anteriores)
    values (TG_TABLE_NAME, TG_OP, v_record_id, v_user_id, v_user_email, row_to_json(OLD));
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- 3. Atrelar o gatilho (Trigger) às tabelas
-- Clientes
drop trigger if exists trg_audit_clientes on public.clientes;
create trigger trg_audit_clientes
after insert or update or delete on public.clientes
for each row execute function public.log_auditoria_trigger();

-- Projetos
drop trigger if exists trg_audit_projetos on public.projetos;
create trigger trg_audit_projetos
after insert or update or delete on public.projetos
for each row execute function public.log_auditoria_trigger();

-- Produtos
drop trigger if exists trg_audit_produtos on public.produtos;
create trigger trg_audit_produtos
after insert or update or delete on public.produtos
for each row execute function public.log_auditoria_trigger();

-- Equipamentos
drop trigger if exists trg_audit_equipamentos on public.equipamentos;
create trigger trg_audit_equipamentos
after insert or update or delete on public.equipamentos
for each row execute function public.log_auditoria_trigger();

-- 4. Ajustar políticas RLS existentes para exigir autenticação em vez de "anon"
-- Se você usou "for all using (true)", recomendo mudar para "to authenticated":
drop policy if exists "allow_all_clientes" on public.clientes;
create policy "allow_auth_clientes" on public.clientes to authenticated using (true) with check (true);

drop policy if exists "allow_all_projetos" on public.projetos;
create policy "allow_auth_projetos" on public.projetos to authenticated using (true) with check (true);

drop policy if exists "allow_all_produtos" on public.produtos;
create policy "allow_auth_produtos" on public.produtos to authenticated using (true) with check (true);

drop policy if exists "allow_all_equipamentos" on public.equipamentos;
create policy "allow_auth_equipamentos" on public.equipamentos to authenticated using (true) with check (true);
