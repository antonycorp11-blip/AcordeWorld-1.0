-- ═══════════════════════════════════════════════════════════════════════════════
-- ACORDELOT — BOTS DA ARENA
--
-- Rode DEPOIS do 001. SQL Editor → New query → Run. Pode rodar de novo sem estragar.
--
-- POR QUE EXISTE. A Arena assíncrona tem um problema de primeiro dia que não se
-- resolve programando melhor: ela precisa de gente. Enquanto só houver uma conta, a
-- lista abre vazia — não dá para testar desafio, troféu, patente nem promoção. E o
-- problema não some no lançamento: os primeiros jogadores de verdade também abrem
-- numa arena vazia, e uma arena vazia ensina a não voltar.
--
-- POR QUE NÃO SÃO PERFIS DE MENTIRA. `perfis.id` referencia `auth.users` — um perfil
-- só existe com uma conta de verdade atrás. Forjar usuário no `auth` à mão é frágil e
-- suja a tabela que cuida de senha. Bot é outra coisa e merece tabela própria: some
-- com um `delete`, não aparece em lugar nenhum que fale de gente, e nunca vai poder
-- entrar no jogo.
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists public.arena_bots (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null unique check (char_length(nome) between 3 and 18),
  poder     integer not null default 0,
  trofeus   integer not null default 0 check (trofeus >= 0),
  vitorias  integer not null default 0,
  derrotas  integer not null default 0,
  config    jsonb not null default '{}'::jsonb,   -- a defesa, no formato do cliente
  criado_em timestamptz not null default now()
);

alter table public.arena_bots enable row level security;

-- Lê todo mundo, escreve ninguém. Mesma regra do ranking: o cliente não tem por que
-- mexer no troféu de um adversário — nem de um que é de mentira.
drop policy if exists "bot: leitura publica" on public.arena_bots;
create policy "bot: leitura publica" on public.arena_bots
  for select using (true);

-- O defensor de uma batalha passa a poder ser um bot, e bot não está em `perfis`. A
-- chave estrangeira sai; o campo `contra_bot` fica dizendo em qual das duas tabelas o
-- uuid mora. Sem isso, toda luta contra bot morreria na integridade referencial.
alter table public.arena_batalhas
  drop constraint if exists arena_batalhas_defensor_fkey;
alter table public.arena_batalhas
  add column if not exists contra_bot boolean not null default false;

-- ── A LISTA, AGORA COM OS DOIS ──────────────────────────────────────────────────
-- Uma união só, para o cliente continuar lendo UMA tabela e não precisar saber que
-- existem duas origens. A coluna `bot` vai junto para quem quiser distinguir — o jogo
-- não precisa, e é de propósito: um adversário que se anuncia como robô não é
-- adversário.
-- `drop` antes de criar, e não `create or replace`: o 001 define esta mesma view com uma
-- coluna a menos, e o Postgres recusa uma substituição que mude a lista de colunas. Sem
-- isto, rodar o 001 de novo depois deste arquivo quebraria — e rodar o 001 de novo é
-- exatamente o que se faz quando algo parece fora do lugar.
--
-- SE UM DIA VOCÊ RODAR O 001 OUTRA VEZ: rode este 002 logo em seguida. O 001 devolve a
-- view sem os bots, e a arena volta a listar só gente de verdade.
drop view if exists public.arena_lista;
create view public.arena_lista as
  select p.id, p.nome, p.poder,
         coalesce(r.trofeus, 0)  as trofeus,
         coalesce(r.vitorias, 0) as vitorias,
         coalesce(r.derrotas, 0) as derrotas,
         (d.perfil_id is not null) as tem_defesa,
         coalesce(d.poder, p.poder) as poder_defesa,
         false as bot
    from perfis p
    left join arena_ranking  r on r.perfil_id = p.id
    left join arena_defesas  d on d.perfil_id = p.id
  union all
  select b.id, b.nome, b.poder, b.trofeus, b.vitorias, b.derrotas,
         true as tem_defesa, b.poder as poder_defesa, true as bot
    from arena_bots b;

grant select on public.arena_lista to anon, authenticated;

-- ── A DEFESA DO BOT, PELA MESMA PORTA ───────────────────────────────────────────
-- O cliente busca defesa em `arena_defesas`. Em vez de ensiná-lo a procurar num
-- segundo lugar, esta view responde pelas duas — o `defesaDe()` continua uma consulta
-- só. Menos código no jogo é menos código para divergir entre o editor e a build.
create or replace view public.arena_defesa_de as
  select perfil_id as alvo, config from arena_defesas
  union all
  select id        as alvo, config from arena_bots;

grant select on public.arena_defesa_de to anon, authenticated;

-- ── REGISTRAR BATALHA, AGORA CIENTE DE BOT ──────────────────────────────────────
-- O desafiante ganha e perde troféu de verdade contra bot: é ele que está sendo
-- testado, e um troféu que só conta contra humano tornaria a arena inicial inútil.
-- O bot também guarda o dele, para a lista não ficar com um bando de zeros.
create or replace function public.registrar_batalha(alvo uuid, venceu boolean)
returns table (trofeus_mov integer, trofeus_agora integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  eu     uuid := auth.uid();
  ehBot  boolean;
  meus   integer;
  dele   integer;
  delta  integer;
  ultima timestamptz;
begin
  if eu is null then
    raise exception 'sem sessão';
  end if;
  if alvo = eu then
    raise exception 'não dá para desafiar a si mesmo';
  end if;

  select exists(select 1 from arena_bots where id = alvo) into ehBot;
  if not ehBot and not exists(select 1 from perfis where id = alvo) then
    raise exception 'adversário não existe';
  end if;

  select max(quando) into ultima
    from arena_batalhas
   where desafiante = eu and defensor = alvo;
  if ultima is not null and ultima > now() - interval '60 seconds' then
    raise exception 'espere um pouco antes de desafiar o mesmo jogador de novo';
  end if;

  insert into arena_ranking (perfil_id) values (eu) on conflict do nothing;
  select trofeus into meus from arena_ranking where perfil_id = eu for update;

  if ehBot then
    select trofeus into dele from arena_bots where id = alvo for update;
  else
    insert into arena_ranking (perfil_id) values (alvo) on conflict do nothing;
    select trofeus into dele from arena_ranking where perfil_id = alvo for update;
  end if;

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

  -- O defensor mexe MENOS que o desafiante: ele não escolheu a hora da briga.
  if ehBot then
    update arena_bots
       set trofeus  = greatest(0, trofeus - (case when venceu then (delta / 2) else 0 end)),
           vitorias = vitorias + (case when venceu then 0 else 1 end),
           derrotas = derrotas + (case when venceu then 1 else 0 end)
     where id = alvo;
  else
    update arena_ranking
       set trofeus  = greatest(0, trofeus - (case when venceu then (delta / 2) else 0 end)),
           vitorias = vitorias + (case when venceu then 0 else 1 end),
           derrotas = derrotas + (case when venceu then 1 else 0 end),
           atualizado_em = now()
     where perfil_id = alvo;
  end if;

  insert into arena_batalhas (desafiante, defensor, venceu, trofeus_mov, contra_bot)
  values (eu, alvo, venceu, delta, ehBot);

  return query
    select delta, r.trofeus from arena_ranking r where r.perfil_id = eu;
end;
$$;

revoke all on function public.registrar_batalha(uuid, boolean) from public;
grant execute on function public.registrar_batalha(uuid, boolean) to authenticated;

-- ── A FÁBRICA DE BOTS ───────────────────────────────────────────────────────────
-- `select gerar_bots(30);` povoa a arena com trinta adversários espalhados por todas
-- as patentes. Rodar de novo acrescenta mais, sem repetir nome.
--
-- A distribuição não é uniforme de propósito: a arena de verdade tem muita gente
-- embaixo e pouca em cima. Uma lista uniforme faria as patentes altas parecerem
-- fáceis de alcançar e as baixas, vazias.
--
-- O `config` sai no MESMO formato que `defesaAPartirDoSave` monta no cliente, para o
-- desafio reconstruir o bot pelo caminho que já existe — nenhum ramo especial no jogo.
-- `herois` é parâmetro porque o elenco cresce. Quando um personagem novo entrar no jogo,
-- os bots passam a usá-lo com uma chamada, sem mexer na função:
--     select gerar_bots(20, array['achilles','wins','o_novo']);
-- O id tem de ser o MESMO de `HERO_DEFINITIONS` no game.js — é por ele que o cliente
-- acha a folha e o combo do defensor.
create or replace function public.gerar_bots(quantos integer default 20,
                                             herois text[] default array['achilles','wins'])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  primeiros text[] := array['Nino','Vera','Caio','Lia','Otto','Mara','Tico','Bento','Zara',
                            'Íris','Duda','Rafa','Kiko','Nara','Elis','Théo','Juca','Sol',
                            'Bruna','Ivo','Malu','Dante','Lena','Pipo','Vini','Cora','Léo',
                            'Fabi','Rui','Tati','Simba','Noa','Gabo','Meli','Rick'];
  sobrenomes text[] := array['Clave','Bemol','Fermata','Tercina','Ostinato','Cadência',
                             'Colcheia','Diapasão','Fusão','Legato','Módulo','Semínima',
                             'Sustenido','Tônica','Uníssono','Vibrato','Coda','Rondó'];
  i          integer := 0;
  criados    integer := 0;
  quantos_h  integer;
  escolhidos text[];
  j          integer;
  k          integer;
  troca      text;
  nome_novo  text;
  trof       integer;
  niv        integer;
  pod        integer;
  cfg        jsonb;
begin
  while i < quantos loop
    i := i + 1;

    -- Cauda longa: `power(random(), 2.2)` empurra a maioria para baixo. Sem isso o topo
    -- da tabela ficaria tão povoado quanto a base, que não é como fila de arena se
    -- parece com nada.
    trof := floor(power(random(), 2.2) * 2600)::int;
    -- Nível e poder acompanham o troféu, com folga: dois jogadores com o mesmo troféu
    -- não têm o mesmo poder, e é essa folga que torna a escolha do adversário uma
    -- decisão em vez de uma leitura de tabela.
    niv  := greatest(8, least(60, 8 + (trof / 55)::int + (random() * 6)::int - 3));
    pod  := greatest(200, (niv * 190 + (random() * niv * 90))::int);

    nome_novo := primeiros[1 + floor(random() * array_length(primeiros, 1))::int]
              || ' ' ||
              sobrenomes[1 + floor(random() * array_length(sobrenomes, 1))::int];
    if char_length(nome_novo) > 18 then
      nome_novo := left(nome_novo, 18);
    end if;
    if exists (select 1 from arena_bots where nome = nome_novo) then
      continue;   -- nome repetido: pula, o próximo laço sorteia outro
    end if;

    -- Um ou dois heróis, sorteados do elenco. Dois é o caso mais comum de propósito:
    -- uma defesa de um só acaba rápido demais e não mostra o que a Arena tem de bom,
    -- que é trocar de alvo no meio da briga.
    quantos_h := least(array_length(herois, 1), case when random() < 0.45 then 1 else 2 end);

    -- EMBARALHADO À MÃO, e não com `order by random() limit n`.
    --
    -- Aquela forma parece certa e não é, dentro de plpgsql: o plano da consulta fica em
    -- cache e o resultado sai IGUAL em todas as voltas do laço. Medido — seis sorteios
    -- seguidos de três nomes devolveram os mesmos dois, sempre os dois primeiros. Todo
    -- bot saía com o primeiro herói da lista, e um personagem novo no fim do elenco
    -- nunca apareceria na Arena.
    --
    -- Fisher-Yates: código fixo, resultado sorteado, sem consulta para o planejador
    -- guardar.
    escolhidos := herois;
    for j in reverse array_length(escolhidos, 1) .. 2 loop
      k := 1 + floor(random() * j)::int;
      troca := escolhidos[j]; escolhidos[j] := escolhidos[k]; escolhidos[k] := troca;
    end loop;
    escolhidos := escolhidos[1:quantos_h];

    cfg := jsonb_build_object(
      'v', 1,
      'automatica', true,
      'poder', pod,
      'herois', (
        select jsonb_agg(jsonb_build_object(
          'id', hid,
          'nivel', greatest(1, niv - (ord - 1) * 2),
          'poder', (pod / quantos_h)::int,
          -- Atributos derivados do nível, com pesos diferentes por posição: o segundo do
          -- time não é uma cópia mais fraca do primeiro.
          'attrs', jsonb_build_object(
            'ritmo',    (niv / (1 + ord))::int, 'afinacao', (niv / (3 - (ord - 1)))::int,
            'folego',   (niv / 3)::int,         'dinamica', (niv / 4)::int,
            'memoria',  (niv / 4)::int),
          'equipado', '{}'::jsonb, 'pet', null))
        from unnest(escolhidos) with ordinality as e(hid, ord)),
      'tiers', '{}'::jsonb, 'pets', '{}'::jsonb, 'acordes', '[]'::jsonb);

    insert into arena_bots (nome, poder, trofeus, vitorias, derrotas, config)
    values (nome_novo, pod, trof,
            (random() * 40)::int, (random() * 30)::int, cfg);
    criados := criados + 1;
  end loop;
  return criados;
end;
$$;

-- A assinatura tem de bater com a da função, INCLUSIVE os parâmetros com valor padrão:
-- o `grant` não os enxerga. Escrito como `gerar_bots(integer)`, ele falhava com "function
-- does not exist" e derrubava o arquivo inteiro antes de criar bot nenhum.
grant execute on function public.gerar_bots(integer, text[]) to authenticated;

-- Povoa agora, mas SÓ se a arena estiver vazia. Sem esta condição, rodar o arquivo de
-- novo — o que se faz sem pensar, para conferir se está tudo lá — acrescentaria mais
-- trinta a cada vez, e em três conferidas a arena teria noventa robôs.
--
-- Para acrescentar mais de propósito:  select gerar_bots(20);
-- Para varrer todos e recomeçar:       delete from public.arena_bots;
select case when (select count(*) from public.arena_bots) = 0
            then public.gerar_bots(30)
            else 0 end as bots_criados_agora;

-- Para varrer todos e recomeçar:  delete from public.arena_bots;
