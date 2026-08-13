# Online e PvP no Acordelot — o que cabe no free, e o que não cabe

> Nota técnica. Números medidos no projeto em 2026-08-06.

---

## A conta que decide tudo

O **Supabase Realtime free** dá **200 conexões simultâneas** e **2 milhões de mensagens por
mês**. A conexão não é o problema — 60 jogadores cabem folgado nas 200. **A mensagem é.**

A fórmula:

```
mensagens/mês = jogadores × taxa(Hz) × segundos_jogados_por_mês
```

Com 60 jogadores mandando posição a 10 Hz (o mínimo para um jogo de ação parecer fluido):

| | |
|---|---|
| Mensagens por segundo | 60 × 10 = **600/s** |
| Em uma hora | **2.160.000** |
| Cota mensal do free | **2.000.000** |

**A cota do mês inteiro morre em 56 minutos.** E o Pro, de 25 dólares, dá 5 milhões — morre
em 2 horas e 20 minutos.

Isso não é o Supabase ser ruim. É **formato de preço errado para o problema**: um laço de
jogo emite mensagem o tempo todo, e Realtime é cobrado por mensagem. Servidor de jogo é
cobrado por CPU.

### Quanto cabe de verdade no free

Invertendo a fórmula, com 2 h/dia por 30 dias (216.000 segundos):

```
2.000.000 / 216.000 = 9,26 mensagens por segundo, no total, para TODO MUNDO
```

Isso é o orçamento inteiro. Dividido por jogador:

| Jogadores simultâneos | Taxa possível por jogador |
|---|---|
| 60 | 1 mensagem a cada **6,5 s** |
| 20 | 1 mensagem a cada **2,2 s** |
| 10 | ~1 mensagem por segundo |

**Conclusão honesta:** o Realtime free aguenta **10 a 15 jogadores** se vendo andar de forma
aproximada, por umas duas horas por dia. Para 50–60 com PvP de ação, não aguenta — nem com
truque.

---

## O que dá para fazer, em três estágios

### Estágio 1 — Praça social (cabe no free hoje)

Uma área e só uma: a praça de Acordelot. Você vê os outros andando, com nome e herói.

Como caber no orçamento:

- **Um canal por mapa.** 60 jogadores espalhados por 8 mapas = 7 por canal, e cada mensagem
  só vai para quem está na mesma sala. Isso é *interest management*, e é o que mais economiza.
- **Só transmite quando muda.** Parado não manda nada. Isso corta uns 60% na prática.
- **2 a 3 Hz, com interpolação no cliente.** O outro jogador desliza suave entre dois pontos
  em vez de teleportar. A 3 Hz com interpolação a sensação é boa para caminhada — não para
  combate.
- **Presence para entrar/sair**, Broadcast só para movimento. Presence é barato e já traz a
  lista de quem está online.

O encanamento **já existe** no projeto: `_iniciarRealtime()` em [game.js](game.js) usa
exatamente esse padrão para a co-edição do editor. É copiar a estrutura trocando os eventos.

### Estágio 2 — PvP assíncrono (custa quase nada, e é o que eu recomendo primeiro)

Aqui não há mensagem em tempo real nenhuma. Só Postgres.

**Placar de dungeon.** Seu melhor tempo e nota por dungeon e dificuldade. Uma linha por
jogador. O jogo já mede tempo, dano sofrido, abates e nota — está tudo pronto em
`avaliarCorrida()`.

**Corrida contra fantasma.** Você grava a posição a 5 Hz durante a corrida — 3 minutos dão
900 amostras, uns 7 KB. Sobe uma vez no fim, baixa uma vez no começo. O adversário aparece
como silhueta translúcida correndo a run dele. **Zero custo de tempo real** e a sensação de
disputa é enorme.

**Duelo de build.** Você desafia outro jogador; uma Edge Function resolve a luta com os dois
Níveis de Poder, equipamentos e passivas, e devolve o resultado. Uma requisição por duelo.

**Duelo de ritmo** — e este é o que combina com o jogo. Os dois recebem a mesma sequência de
notas; cada um toca; o servidor confere a precisão de tempo. É PvP de verdade, é quase
impossível de trapacear, e é **educação musical virando esporte**. Num jogo sobre música,
isso vale mais que um deathmatch.

### Estágio 3 — PvP em tempo real (precisa sair do Supabase Realtime)

Um servidor WebSocket próprio, cobrado por CPU e não por mensagem.

| Opção | Custo | Observação |
|---|---|---|
| **Fly.io** — `shared-cpu-1x`, 256 MB | ~US$ 2–4/mês | Node + `ws`. Simples e suficiente. |
| **Cloudflare Durable Objects** | US$ 5/mês (Workers Paid) | Feito exatamente para salas de jogo. Uma DO por partida. |
| **PartyKit** | free generoso | Camada em cima de DO, API bem mais simples. |
| **VPS** (Hetzner, Oracle free) | US$ 0–5/mês | Mais trabalho, controle total. |

Uma máquina de 256 MB aguenta **60 jogadores a 20 Hz** sem suar, desde que sejam **salas de
2 a 6**, não 60 no mesmo mundo. 15 salas de 4 é o desenho certo.

Arquitetura mínima:
- Servidor autoritativo com tique de 20 Hz.
- Cliente manda **input** (direção, botão apertado), nunca posição.
- Servidor devolve snapshot delta.
- Cliente faz predição e reconciliação — já que ele desenha a 60 fps sobre 20 de rede.

---

## O problema que ninguém lembra até o primeiro trapaceiro

**O jogo hoje é 100% cliente-autoritativo.** `playerDamage()`, o sorteio de crítico, a vida
dos monstros, os cooldowns — tudo roda no navegador. Em PvE isso não importa: quem trapaceia
engana a si mesmo.

Em PvP, **quem abrir o console ganha**. Uma linha muda o dano para mil.

O mínimo para PvP honesto é o servidor ser dono de:

1. **Posição** — com teto de velocidade. Se o cliente diz que andou 400 px em 50 ms, o
   servidor recusa.
2. **Dano e vida** — o cliente pede "ataquei", o servidor decide se acertou e quanto tirou.
3. **Recargas** — o servidor conta o tempo das habilidades.

Isso é uma reescrita real do caminho de resolução do combate, não um ajuste. **É a razão
mais forte para começar pelo assíncrono**: fantasma e placar não têm o que trapacear que
importe, e duelo de ritmo é conferido no servidor por natureza.

---

## Vercel: o gargalo que você ainda não viu

Medi o build publicado:

| | |
|---|---|
| `dist/` inteiro | **166 MB** |
| Uma sessão nova baixa | **~45–50 MB** (heróis 14 MB, monstros 12,6 MB, itens/ui 15 MB, dados 4 MB, o mapa) |
| Vercel Hobby | **100 GB/mês** |
| Sessões novas por mês | **~2.000** |

Para 60 jogadores dá uns 33 primeiros acessos cada — e as visitas seguintes são quase de
graça, porque o `vercel.json` só desliga o cache do `index.html`; os assets ficam guardados
no navegador.

Cabe. Mas vale saber de duas coisas:

**34 MB são vídeos** (`assets/videos`). Se as cenas de vídeo não estão em uso, tirar do build
corta um quinto do peso.

**Vercel Hobby é para uso não comercial.** No dia em que o jogo cobrar qualquer coisa —
inclusive um passe de dungeon — precisa migrar para o Pro.

---

## O que eu faria, na ordem

**1. Placar de dungeon.** Uma tabela no Postgres, uma escrita no fim da corrida, uma leitura
ao abrir o portão. Meio dia de trabalho e o jogo vira competitivo.

**2. Fantasma.** Grava e reproduz. É o que dá sensação de multiplayer sem multiplayer.

**3. Praça social.** Uma área, canal por mapa, 3 Hz, só quando anda. Dá a sensação de mundo
vivo, e o encanamento já está escrito no editor.

**4. Duelo de ritmo assíncrono.** O PvP que combina com o jogo, resolvido no servidor.

**5. Só então PvP em tempo real**, num servidor próprio de 5 dólares, com salas pequenas — e
com o combate reescrito para o servidor mandar.

Os quatro primeiros cabem no free. O quinto não cabe em free nenhum, de fornecedor nenhum,
porque o custo dele é CPU ligada o tempo todo. Cinco dólares por mês, e o problema é outro.

---

# A Arena como destino, e não como placar

Anotado da conversa, para não se perder: a Arena não é só "bater no save do outro". Ela
é o lugar onde mora conteúdo que **não existe em nenhum outro canto do jogo**. É isso que
faz o jogador voltar todo dia — placar sozinho cansa em uma semana.

## Três tipos de adversário, não um

**1. A sombra do jogador.** O que já está de pé: o save de outra conta, montado como
defesa, brigando sozinho. Rende troféu e patente.

**2. Monstro exclusivo da Arena.** Bicho que o mundo não tem e não vai ter. É por aqui que
cai a **pedra de evolução dos Ecos** — e essa é a decisão que sustenta a Arena inteira: o
jogador que quer evoluir o Eco não tem outro caminho. Dungeon dá Partitura, Clareira dá
Alma, fazenda dá fragmento; **evolução só na Arena**.

**3. Chefe de banner.** Os personagens novos que entram no gacha aparecem na Arena como
chefe, sem dono, antes ou durante o banner. Serve a duas coisas ao mesmo tempo: o jogador
**conhece** o personagem lutando contra ele — que é bem melhor propaganda que uma tela de
banner — e leva ponto por enfrentá-lo, mesmo perdendo. Uma chance **pequena** de cair a
moeda do banner. Pequena de verdade: se cair fácil, o banner morre; se nunca cair, o
jogador para de tentar o chefe.

## O que isso exige do banco

Fora as quatro tabelas que já existem (`perfis`, `arena_defesas`, `arena_ranking`,
`arena_batalhas`), entra:

| tabela | para quê |
|---|---|
| `arena_chefes` | quem é o chefe da vez, de quando até quando, e a tabela de recompensa |
| `arena_tentativas` | quantas vezes esta conta já bateu no chefe hoje — o teto mora no servidor |
| `banner` | o banner corrente, as chances por raridade, quando abre e quando fecha |
| `invocacoes` | histórico de puxada: o que saiu, quando, e o contador de pena (*pity*) |
| `carteira` | a moeda de banner. **Fora do save em JSONB**, e escrita só por função |

A regra de sempre: **nada que o jogador ganha pode ser escrito pelo cliente.** Moeda de
banner e pedra de evolução seguem o mesmo caminho do troféu — uma função
`security definer`, sorteio no servidor, RLS sem política de escrita. Se o sorteio rodar
no navegador, a primeira pessoa a abrir o console tira o personagem cinco estrelas na
primeira tentativa, e o banner deixa de valer qualquer coisa.

O teto de tentativas também é do servidor, e pelo mesmo motivo do limite de 60 s que já
está no `registrar_batalha`: sem teto, o chefe vira uma torneira de moeda.

## Ordem que eu proponho

1. Banco de pé e login funcionando (é onde estamos).
2. Sombra do jogador — a Arena mínima, que já está quase inteira.
3. Monstro exclusivo + pedra de evolução. **Aqui a Arena passa a ser necessária**, e é o
   passo de maior retorno pelo tamanho: o sistema de evolução dos Ecos já existe escrito,
   só falta a pedra ter de onde cair.
4. Cenário mudando por patente.
5. Chefe de banner e gacha — o maior dos cinco, e o único que mexe com dinheiro de
   verdade se um dia a moeda for comprável. Vale entrar por último, com o resto assentado.
