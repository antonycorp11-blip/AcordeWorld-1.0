-- ═══════════════════════════════════════════════════════════════════════════════
-- ACORDELOT — CONTAS E ARENA
--
-- Rode isto UMA VEZ no painel do Supabase, em SQL Editor → New query → Run.
-- O jogo usa a chave ANON, que é pública por natureza: quem abrir o site a enxerga.
-- Por isso TODA proteção real mora aqui, nas políticas de RLS — não no cliente.
--
-- A regra que guia o arquivo inteiro:
--   ler o que é público, escrever só o que é seu, e nunca poder escrever no seu
--   próprio troféu.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── PERFIS ──────────────────────────────────────────────────────────────────────
-- Um por conta. O `save` é o mesmo objeto que hoje mora no localStorage: guardar em
-- JSONB evita ter de migrar o banco toda vez que o jogo ganha um campo novo — e ele
-- ganha um campo novo quase toda semana.
--
-- `nome` e `poder` ficam FORA do JSONB de propósito: são o que a lista da arena
-- mostra, e consultar dentro do JSON para montar um ranking é lento e desajeitado.
create table if not exists public.perfis (
  id            uuid primary key references auth.users(id) on delete cascade,
  nome          text not null unique check (char_length(nome) between 3 and 18),
  save          jsonb not null default '{}'::jsonb,
  poder         integer not null default 0,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.perfis enable row level security;

-- Qualquer um LÊ: a arena precisa listar adversários. O save vai junto porque é dele
-- que a defesa é montada quando alguém desafia — e ele não guarda nada sigiloso.
drop policy if exists "perfil: leitura publica" on public.perfis;
create policy "perfil: leitura publica" on public.perfis
  for select using (true);

drop policy if exists "perfil: dono cria" on public.perfis;
create policy "perfil: dono cria" on public.perfis
  for insert with check (auth.uid() = id);

drop policy if exists "perfil: dono altera" on public.perfis;
create policy "perfil: dono altera" on public.perfis
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ── DEFESA DA ARENA ─────────────────────────────────────────────────────────────
-- O que o jogador deixa montado para ser desafiado enquanto está offline: quais
-- heróis, em que ordem, com quais Ecos, acordes e equipamentos.
--
-- É uma tabela separada do perfil porque tem vida própria: o jogador muda a defesa
-- sem mexer no save, e o desafiante lê SÓ isto — não precisa baixar o save inteiro
-- de outra pessoa para brigar com ela.
create table if not exists public.arena_defesas (
  perfil_id     uuid primary key references public.perfis(id) on delete cascade,
  config        jsonb not null default '{}'::jsonb,
  poder         integer not null default 0,
  atualizado_em timestamptz not null default now()
);

alter table public.arena_defesas enable row level security;

drop policy if exists "defesa: leitura publica" on public.arena_defesas;
create policy "defesa: leitura publica" on public.arena_defesas
  for select using (true);

drop policy if exists "defesa: dono escreve" on public.arena_defesas;
create policy "defesa: dono escreve" on public.arena_defesas
  for all using (auth.uid() = perfil_id) with check (auth.uid() = perfil_id);

-- ── RANKING ─────────────────────────────────────────────────────────────────────
-- Troféus, patente e o histórico curto de vitórias.
--
-- NINGUÉM escreve aqui pelo cliente. Não há política de insert nem de update: a
-- única porta é a função `registrar_batalha`, mais abaixo, que roda com os
-- privilégios do dono do banco. Se o cliente pudesse escrever o próprio troféu, o
-- ranking valeria o quanto vale um número que o adversário digita.
create table if not exists public.arena_ranking (
  perfil_id     uuid primary key references public.perfis(id) on delete cascade,
  trofeus       integer not null default 0 check (trofeus >= 0),
  vitorias      integer not null default 0,
  derrotas      integer not null default 0,
  atualizado_em timestamptz not null default now()
);

alter table public.arena_ranking enable row level security;

drop policy if exists "ranking: leitura publica" on public.arena_ranking;
create policy "ranking: leitura publica" on public.arena_ranking
  for select using (true);

-- ── BATALHAS ────────────────────────────────────────────────────────────────────
-- Uma linha por desafio. Serve para o histórico do jogador ("quem me atacou?") e
-- para segurar abuso: dá para ver quem desafiou o mesmo alvo trinta vezes em um
-- minuto.
create table if not exists public.arena_batalhas (
  id           bigserial primary key,
  desafiante   uuid not null references public.perfis(id) on delete cascade,
  defensor     uuid not null references public.perfis(id) on delete cascade,
  venceu       boolean not null,
  trofeus_mov  integer not null default 0,
  quando       timestamptz not null default now()
);

alter table public.arena_batalhas enable row level security;

drop policy if exists "batalha: leitura publica" on public.arena_batalhas;
create policy "batalha: leitura publica" on public.arena_batalhas
  for select using (true);

create index if not exists arena_batalhas_defensor_idx
  on public.arena_batalhas (defensor, quando desc);
create index if not exists arena_batalhas_desafiante_idx
  on public.arena_batalhas (desafiante, quando desc);

-- ── A ÚNICA PORTA PARA O RANKING ────────────────────────────────────────────────
-- `security definer` faz a função rodar com os privilégios de quem a criou, e não de
-- quem a chama: é assim que o cliente consegue mover troféus sem ter permissão de
-- escrever na tabela.
--
-- Três defesas embutidas:
--   1. o desafiante é sempre `auth.uid()` — não dá para lutar em nome de outro;
--   2. não dá para desafiar a si mesmo;
--   3. no máximo uma batalha contra o MESMO alvo a cada 60 s, para não se moer um
--      adversário fraco em looping.
--
-- A conta dos troféus é a clássica por diferença: ganhar de quem tem muito rende
-- mais, ganhar de quem tem pouco rende pouco. Piso e teto impedem tanto o troco
-- irrisório quanto a subida de um salto só.
create or replace function public.registrar_batalha(alvo uuid, venceu boolean)
returns table (trofeus_mov integer, trofeus_agora integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  eu          uuid := auth.uid();
  meus        integer;
  dele        integer;
  delta       integer;
  ultima      timestamptz;
begin
  if eu is null then
    raise exception 'sem sessão';
  end if;
  if alvo = eu then
    raise exception 'não dá para desafiar a si mesmo';
  end if;

  select max(quando) into ultima
    from arena_batalhas
   where desafiante = eu and defensor = alvo;
  if ultima is not null and ultima > now() - interval '60 seconds' then
    raise exception 'espere um pouco antes de desafiar o mesmo jogador de novo';
  end if;

  insert into arena_ranking (perfil_id) values (eu)   on conflict do nothing;
  insert into arena_ranking (perfil_id) values (alvo) on conflict do nothing;

  select trofeus into meus from arena_ranking where perfil_id = eu   for update;
  select trofeus into dele from arena_ranking where perfil_id = alvo for update;

  -- Quanto mais alto o adversário em relação a mim, mais vale vencê-lo.
  delta := greatest(8, least(40, 24 + ((dele - meus) / 25)));
  if not venceu then
    delta := -greatest(4, least(24, 16 - ((dele - meus) / 25)));
  end if;

  update arena_ranking
     set trofeus  = greatest(0, trofeus + delta),
         vitorias = vitorias + (case when venceu then 1 else 0 end),
         derrotas = derrotas + (case when venceu then 0 else 1 end),
         atualizado_em = now()
   where perfil_id = eu;

  -- O defensor mexe MENOS que o desafiante: ele não escolheu a hora da briga, e
  -- perder troféu dormindo na mesma proporção afastaria quem monta defesa.
  update arena_ranking
     set trofeus = greatest(0, trofeus - (case when venceu then (delta / 2) else 0 end)),
         vitorias = vitorias + (case when venceu then 0 else 1 end),
         derrotas = derrotas + (case when venceu then 1 else 0 end),
         atualizado_em = now()
   where perfil_id = alvo;

  insert into arena_batalhas (desafiante, defensor, venceu, trofeus_mov)
  values (eu, alvo, venceu, delta);

  return query
    select delta, r.trofeus from arena_ranking r where r.perfil_id = eu;
end;
$$;

revoke all on function public.registrar_batalha(uuid, boolean) from public;
grant execute on function public.registrar_batalha(uuid, boolean) to authenticated;

-- ── A LISTA DA ARENA ────────────────────────────────────────────────────────────
-- Uma view só, para o cliente não ter de costurar três tabelas no navegador.
create or replace view public.arena_lista as
  select p.id, p.nome, p.poder,
         coalesce(r.trofeus, 0)  as trofeus,
         coalesce(r.vitorias, 0) as vitorias,
         coalesce(r.derrotas, 0) as derrotas,
         (d.perfil_id is not null) as tem_defesa,
         coalesce(d.poder, p.poder) as poder_defesa
    from perfis p
    left join arena_ranking  r on r.perfil_id = p.id
    left join arena_defesas  d on d.perfil_id = p.id;

grant select on public.arena_lista to anon, authenticated;
