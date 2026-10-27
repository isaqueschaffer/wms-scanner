# WMS Scanner (Projeto estoque)

SPA React 19 + Vite 8 + Tailwind 4 + react-router-dom 7 + lucide-react + xlsx, com Supabase (Postgres, Auth, RLS) como backend. Sem servidor próprio. Interface em português do Brasil.

- Produção: Cloudflare Worker com assets estáticos (`wrangler.jsonc`), https://wms-scanner.isaquegeovaneschaffer.workers.dev. Repo `isaqueschaffer/wms-scanner`, branch `master`. O deploy é automático a cada push.
- Variáveis de build no Cloudflare: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Local: `localhost:8080`.
- Windows + PowerShell/Git Bash. Avisos "LF will be replaced by CRLF" do git são inofensivos.
- Verificação: `npx vite build` deve passar; `npx oxlint src` tem avisos antigos (set-state-in-effect, exhaustive-deps, variáveis não usadas) que podem ficar, mas não crie avisos novos.
- Fluxo do usuário: depois de cada alteração, commit + push no `master` sem perguntar (ver memória). Mensagens de commit em português.
- Não commitar `.agents/`, `.claude/` (worktrees de agentes) nem `skills-lock.json`.

## Banco de dados (Supabase)

- Não há CLI de migração. Os arquivos `database/migration_vN.sql` são rodados **manualmente pelo usuário no SQL Editor do Supabase**. Você não consegue executá-los; peça ao usuário e dê o SQL exato. Rodar a migração **antes** de publicar o front-end que depende dela (o select de colunas novas quebra a tela se a coluna não existir).
- Estado: v6 rodada. **v7 e v8 precisam de confirmação**: a função `enfileirar_omie()` corrigida (lê o id via `to_jsonb`) tinha que ser reaplicada, e o v8 (produtos sem S/N) ainda não foi confirmado como rodado. Confira com o usuário. Teste da função: `select prosrc like '%new.ean%' from pg_proc where proname='enfileirar_omie'` deve dar `false`.
- **v9 (lixeira) foi entregue em 2026-10-26 e o usuário ainda precisa rodar** (confirme com ele): sem ela quebram o botão Lixeira, a tela `/admin/projetos/:id/lixeira` e a retirada de produtos sem S/N (RPC `retirar_equipamento_sem_sn`). O front-end já foi publicado antes da migration.
- Armadilha plpgsql: `case when ... then new.ean else new.id end` é planejado como uma expressão só e falha em tabelas sem a coluna `ean`, mesmo no ramo não executado. Use `to_jsonb(new) ->> 'coluna'`.
- Produtos têm PK `ean`. Equipamentos têm índice único `(projeto_id, sn)`. Códigos de erro usados na UI: `23505` (duplicado) e `23514` (check/trigger).
- Auditoria: trigger `log_auditoria_trigger` em quase todas as tabelas. O DELETE guarda a linha inteira em `logs_auditoria.dados_anteriores` (jsonb). Dá para recuperar equipamentos apagados antes da lixeira com `insert into equipamentos ... select (dados_anteriores->>'id')::uuid, ... from logs_auditoria where tabela='equipamentos' and acao='DELETE' and dados_anteriores->>'projeto_id'='<uuid>' on conflict do nothing` (dê sempre um `select` de prévia antes). O usuário já usou isso uma vez.
- **Lixeira (v9)**: tabela `equipamentos_lixeira` (id próprio + `equipamento_id`, `projeto_id` com FK cascade, `ean`, `sn`, `quantidade`, `alocacoes` jsonb, `removido_em/por/por_email`). Trigger `BEFORE DELETE` em `equipamentos` copia a linha e o histórico de `alocacao_equipamentos` para lá (com `pg_trigger_depth() > 1` ignora exclusão em cascata de projeto). `retirar_equipamento_sem_sn(projeto, ean, qtd)` tira quantidade parcial/total e guarda na lixeira. `restaurar_da_lixeira(uuid[])` devolve ao projeto item a item e responde `{restaurados, falhas:[{sn,ean,motivo}]}`: sem S/N soma na linha existente; com S/N volta com o mesmo id e o histórico de técnico (falha com 23505 se o S/N foi recadastrado). Toda exclusão de equipamento passa por ela, inclusive a do Scanner normal e "Excluir bipe" da tela do projeto. Itens apagados antes da v9 não estão lá (só na Auditoria).
- RLS ainda está aberta demais (`to authenticated using (true)`), e o login permite **cadastro público**: qualquer pessoa que se cadastrar lê e apaga tudo. Correção real: desligar "Allow new users to sign up" no painel do Supabase (só o usuário pode) e depois restringir as políticas. Pendente, aguardando decisão do usuário.

## Regras de negócio já implementadas

- **Scanner**: nunca salvar EAN como S/N; fila sequencial de gravação com limpeza imediata do input (evita seriais concatenados); editar e excluir seriais da sessão.
- **Padrão de S/N por produto** (Scanner.jsx, `aprenderPadrao`/`checarPadrao`): aprendido a partir dos 2 últimos seriais aceitos (tamanho, máscara por posição D/L/A/símbolo, prefixo de letras, caixa). Seriais fora do padrão são recusados; clicar no texto "Padrão: …" redefine.
- **Produtos sem S/N** (ex.: bobina), migration v8: `produtos.controla_sn=false` → uma linha por produto no projeto com `equipamentos.quantidade` (sn nulo); RPC `adicionar_equipamento_sem_sn` soma a quantidade de forma atômica. A tela de equipamentos do projeto já suporta. **O scanner e a tela de Alocações ainda não** (a alocação acha o equipamento pelo S/N).
- **Retirada do projeto** (botão vermelho "Retirar do Projeto" na tela do projeto): tela cheia `RetiradaScanner.jsx` em `/retirar/:id` (fora do AdminLayout, como o Scanner), mesmo fluxo do scanner (EAN ou lista de produtos do projeto → quantidade a retirar → bipar cada S/N), com o projeto já fixo e cada leitura tirando o item (indo para a lixeira). Valida que o S/N existe no projeto e pertence ao produto travado; fila sequencial como no Scanner; produto sem S/N retira direto pela quantidade (RPC); "Desfazer" restaura da lixeira; F2 troca de produto, F10 finaliza. Não usa o padrão de S/N aprendido. O pedido original do usuário era "igual ao ir para o scanner, mas sem escolher projeto e tirando em vez de entrar". Uma versão anterior em modal (produto + S/N/quantidade) foi descartada.
- **Lixeira por projeto**: página `LixeiraProjetoAdmin.jsx` em `/admin/projetos/:id/lixeira` (botão "Lixeira (N)" na tela do projeto e atalho na retirada): restaurar um/vários, excluir definitivamente um/vários (com confirmação). Para as ações em lote o `DataTable` ganhou a prop `acoesEmLote` (`{label(qtd), icon, className, confirmMessage(qtd), onRun(ids)}`), além do `onDeleteMany`.
- Relatório de quantidades do projeto mostra só "Total de Produtos" (o usuário pediu para tirar "Total de Itens").

## Integração futura com o Omie

- Padrão outbox: triggers em `clientes`, `produtos` e `projetos` enchem a tabela `omie_fila` (um item pendente por registro). Um worker (Supabase Edge Function, **ainda não escrito**) lê a fila e chama a API do Omie.
- O id local (uuid, ou EAN em produtos) é enviado como `codigo_*_integracao`; o código devolvido fica em `omie_codigo`.
- `app_key`/`app_secret` do Omie só em Supabase secrets. Nunca no front-end e nunca `service_role` no navegador.
- Perguntas ainda sem resposta do usuário: origem da verdade dos cadastros (Omie→WMS ou WMS→Omie), o que fazer com o estoque bipado (entrada, remessa/pedido ou só informativo), projeto como centro de custo ou projeto real do Omie, e se já têm as credenciais.
- Clientes têm razão social, CNPJ/CPF (só dígitos, 11 ou 14), e-mail, cidade e UF; produtos têm SKU (`codigo`), unidade e NCM (8 dígitos).

## Convenções de interface

- Componentes compartilhados em `src/components/ui/`: `Modal` (acessível, fecha com Esc, prop `maxWidth`; não fecha clicando fora de propósito), `Field` (liga label ao input; o filho precisa ser o próprio input/select/textarea), `Breadcrumb`, `DataTable` (busca/datas/página/linhas ficam na URL via query params `q`, `de`, `ate`, `p`, `n`), `ToastContainer`. Hook `useDocumentTitle` (título da aba; sem título não mexe).
- Rotas são `React.lazy` em `App.jsx`; há rota 404. O menu lateral é agrupado em `AdminLayout.jsx` (`NAV_GROUPS`); adicione telas novas lá.
- Botões só com ícone: sempre `aria-label` (e `title`); ícones decorativos com `aria-hidden="true"`. Links de navegação são `<Link>`, não `<a href>` nem botão.
- Textos pequenos usam no mínimo `text-slate-400` sobre o fundo escuro (contraste); use `…` em vez de `...`; `tabular-nums` em números; datas com `'pt-BR'`.
- Campos de serial/código: `autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false}`.
- Ainda existem ~21 `alert()` nos formulários; o plano é trocar por toast ou erro inline. Botões de salvar desabilitados por formulário vazio também são um ponto a melhorar.

## Skills

Instaladas globalmente em `~/.claude/skills`: `frontend-design`, `web-design-guidelines`, `supabase`, `supabase-postgres-best-practices`, `workers-best-practices`. Use `web-design-guidelines` para auditar a interface e `supabase-postgres-best-practices` antes de escrever SQL.
