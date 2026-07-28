# Acordelot — Registro da Sessão

Tudo que foi construído, na ordem, com os diálogos e a linha de missões passo a passo.

---

## 1. Monstro Shiker

Substituiu os cinco monstros genéricos da abertura. Um monstro só, coerente com a lore.

- Folha de sprites 4×3: linha 0 parado, linha 1 caminhada, linha 2 ataque.
- **Vida 60**, dano 6, velocidade 1.7, alcance de perseguição 320px.
- **Persegue o jogador** respeitando o chão pintado — testa colisão a cada passo e desliza
  pela parede em vez de travar. Nunca atravessa copa de árvore.
- **Ataque em três tempos**: bote (190ms, você vê vindo) → impacto (só acerta se você
  ainda estiver ao alcance) → recuperação (460ms). Dá para escapar recuando.
- Os vultos que cruzam a tela na abertura agora são a **silhueta do próprio Shiker**.

## 2. Sistema de cenas (cutscenes)

Motor orientado a dados: cada cena é um JSON em `assets/cutscenes/`, listada no
`index.json`. Escrever cena nova é escrever texto, não código.

**Comandos disponíveis**: `falar` (com `auto` para seguir sozinho), `legenda`, `tutorial`,
`esperar`, `esperarAndar`, `esperarPerto`, `esperarMortos`, `escurecer`, `tingir`,
`vinheta`, `tremer`, `ambiente` (amanhecer/anoitecer), `controle`, `hud`, `posicionar`,
`monstro`, `sombra`, `notas`, `guiar`, `acenar`, `andar`, `andarJogador`, `mostrar`,
`destacar`, `dar`, `curar`, `missao`, `objetivo`, `limparMonstros`, `som`, `fim`.

**Gatilhos**: por chegada ao mapa (padrão) ou por conversa com um NPC
(`gatilho: {tipo:"falar", npc:"Antony"}`), com condições (`requer`) baseadas no estado
das missões. Cada cena roda **uma vez só**.

## 3. Sistema de missões

Objetivos declarados em `assets/quests/quests.json`. Tipos: `talk`, `coletar`, `forjar`,
`martelar`. O campo `requer` segura um objetivo até os anteriores ficarem prontos.
Missões podem encadear cenas ao serem concluídas (`aoConcluir`).

**Rastreador na tela**, abaixo da barra de vida: título, objetivos com ☑ feito,
☐ disponível, 🔒 bloqueado, e contador nos de coleta.

**Marcador sobre a cabeça dos NPCs**: `!` dourado quando há cena/missão nova ali,
`?` azul quando aquele NPC é objetivo de uma missão em andamento.

## 4. Forja de ritmo — "Bata no Compasso"

O menu da forja **não existia em HTML** — foi construído do zero.

- Cursor varre uma barra. Zona dourada = PERFEITO (2 pontos), laranja = BOM (1),
  fora = esfria o metal.
- **Barra de calor** cai o tempo todo. Acerto em cheio reaquece, erro esfria.
  Se zerar, sai o que deu.
- O cursor **acelera a cada martelada**; a zona dourada é mais estreita nos tiers altos.
- **Qualidade**: Comum / Boa ✦ / Ressonante ✦✦ → +0%, +15%, +30% de eficiência de coleta.
- **Nunca se perde material.** Errar tudo entrega a ferramenta Comum.
- Martelar aceita botão, ESPAÇO/E e toque em qualquer lugar do painel.

## 5. Ferramentas e equipamento

- **Martelos** viraram categoria nova (5 tiers, sprites recortados da folha).
- A ferramenta equipada aparece **na mão do personagem**, espelhada conforme a direção,
  atrás do corpo quando anda para cima, com arco de golpe ao bater e brilho quando
  Ressonante.
- **Hotbar redesenhada**: mostra a arte real da ferramenta, selo de qualidade, slot
  apagado quando o item ainda não foi conquistado, contador nas poções. Some durante
  diálogos, cenas, forja e menus.

## 6. Cenários e navegação

- **Ambiente noturno por mapa** (`ambience` no world config): escurecimento em multiply
  + halo de luz ao redor do personagem. Floresta 0.86, vilarejo 0.82.
- **Elemento Porta**: visível só no editor, abre interiores. Escolha o destino no
  Inspetor. Sem destino, serve de alvo para caminhadas de cena.
- **Elemento Ponto de Martelada**: alvo de trabalho, invisível no jogo.
- **Interior novo: 🎼 Forjador de Escalas** — o salão da magia, já navegável.
- Interiores ganharam **marcação visual**: anel no balcão/bigorna/altar e faixa dourada
  na saída, ambos com o rótulo da ação.

---

# A LINHA DE MISSÕES, PASSO A PASSO

## Cena 1 — A Abertura (Floresta Sombria)

Tela preta. Vento. *"...?"* / *"...Onde eu estou?"*

O personagem acorda sem memória numa floresta em silêncio absoluto. Anda, comenta que
nem os pássaros cantam. **Vultos de Shiker** cruzam a tela duas vezes. Um Shiker aparece
— primeiro combate, tutorial de ataque. Ao morrer, dropa uma **Clave Musical**.

Então vem a **emboscada**: cinco Shikers cercam o jogador, que não tem como vencer.
Quando tudo escurece, **notas musicais** surgem e o protegem. O mundo cinza volta a ter
cor. As notas se organizam numa **trilha apontando o caminho**, com um farol na saída.

## Cena 2 — O Vilarejo à Noite (mapa 1_1)

Legenda em tela cheia: *"Seguindo as notas musicais, ele caminhou por horas na escuridão."*
/ *"Quando as pernas já pesavam, luzes fracas surgiram entre as árvores. Um vilarejo."*

Tutorial manda se aproximar da aldeã. Ela acena.

> **Mirela**: Ei! Você aí!
> **Mirela**: Veio andando da floresta... a esta hora?
> **Personagem**: Eu... acho que sim. Não me lembro de muita coisa.
> **Mirela**: Ninguém caminha perto da floresta depois que escurece. Ninguém.
> **Mirela**: As criaturas descem quando o silêncio toma conta. Você teve sorte.
> **Mirela**: Venha. Minha casa é ali. Você dorme, espera o sol nascer.
> **Mirela**: De manhã, siga a estrada até Acordelot. À noite, essa estrada não é sua amiga.

Os dois **caminham até a porta e entram**. Tela escurece. Legenda: *"A noite passou em
silêncio, longe da floresta."*

> **Mirela**: Dormiu bem? O sol já está subindo.
> **Mirela**: Agora é hora de você ir até a cidade.
> **Mirela**: Acordelot. É lá que vão poder te ajudar de verdade.
> **Mirela**: Alguém lá vai saber o que essas notas querem de você.

**Amanhece de verdade** (a luz do mapa sobe de 0.82 para 0.12), os dois reaparecem na
porta, controle devolvido.

## Cena 3 — Os Portões Reais (mapa 0_1)

Legendas da subida da estrada até os portões.

> **Renaldo**: ALTO LÁ!
> **Renaldo**: ...ah. Desculpa. Eu ensaiei isso a manhã inteira e você é a primeira pessoa a passar.
> **Renaldo**: Guarda Renaldo, dos Portões Reais de Acordelot. Vamos ao protocolo.
> **Renaldo**: Nome do viajante...
> **Renaldo**: [seu nome]. Certo. Já está no registro.
> **Personagem**: Como você...?
> **Renaldo**: Mirela mandou um mensageiro antes do sol nascer. Aquela mulher acorda cedo demais.
> **Renaldo**: Item declarado: uma clave musical.
> **Renaldo**: Nossa. Você a tirou de um Shiker? Sozinho?
> **Personagem**: Ele começou.
> **Renaldo**: Eu vou anotar exatamente isso.
> **Renaldo**: Bem-vindo a Acordelot. Primeira cidade do Reino da Música.
> **Renaldo**: Todo músico do reino começa a jornada aqui. Alguns terminam também, mas isso é outra conversa.
> **Renaldo**: Procure o Sr. Antony, na Praça Central. Ele é o líder daqui.
> **Renaldo**: Homem sábio. Fala bonito. Fala muito. Leve paciência.

## Cena 4 — O Líder de Acordelot (Praça Central)

Ao entrar na praça, a **câmera aproxima no Sr. Antony** com o nome dele na tela.
Falar com ele dispara:

> **Antony**: Ah! Então é você que o Renaldo anunciou pelo rádio da guarda.
> **Antony**: Nós não temos rádio. Ele grita. Mas o efeito é o mesmo.
> **Antony**: Sou Antony, líder desta cidade. E você é...?
> **Personagem**: [seu nome]. Vim da floresta.
> **Antony**: Da floresta.
> **Antony**: À noite.
> **Antony**: A pé.
> **Antony**: Rapaz, tem gente nesta cidade que não atravessa a praça depois do jantar.
> **Antony**: E isso na sua mão... me mostre.
> **Antony**: Uma Clave Musical. De um Shiker.
> **Antony**: Eu tenho oitenta e dois anos e nunca segurei uma dessas.
> **Personagem**: É importante?
> **Antony**: Meu jovem, isso não é importante. Isso é o começo de alguma coisa.
> **Antony**: Mas antes de qualquer coisa: aqui em Acordelot, amizade vale mais que espada.
> **Antony**: Uma nota sozinha é só barulho. Duas já são música.
> **Antony**: Vá se apresentar ao Bardo Lucian — ele toca ali perto e fala pelos cotovelos.
> **Antony**: Depois, ao Mercador Tibério. Compre nada, ele vai tentar.
> **Antony**: Quando conhecer os dois, volte aqui. Aí conversamos sério.

### 🏆 MISSÃO 1 — Amizade Importa
- ☐ Fale com o Bardo Lucian
- ☐ Fale com o Mercador Tibério
- 🔒 Volte ao Sr. Antony *(destrava com os dois acima)*
- Recompensa: 90 XP + 60 moedas

**Bardo Lucian** (com escolha de resposta):
> Opa! Rosto novo! Rosto novo é público novo!
> Lucian, bardo desta praça por escolha própria e por decisão do conselho da cidade.
> Foi mais decisão do conselho, na verdade.
> E você é [seu nome], o que veio da floresta a pé. A cidade inteira já sabe.
> Quer ouvir a balada que eu compus sobre isso?
>
> → *"Você compôs uma balada? Já?"*
> Ainda não tem melodia. Nem letra. Mas o título está pronto:
> "O Andarilho Que Não Sabia Que Devia Ter Medo".
> Forte, não é? Eu chorei escrevendo o título.
> Olha, brincadeiras à parte... ninguém sai daquela floresta de noite. Ninguém.
> Se o Sr. Antony te mandou falar comigo, é porque ele viu alguma coisa em você.
> O velho não erra. Irrita, mas não erra.

**Mercador Tibério** (com escolha de resposta):
> Bem-vindo, bem-vindo! Tibério, mercador honesto — pergunte a qualquer um.
> Não pergunte ao Lucian.
> Ah, você é o da floresta! Então já sei o que te oferecer.
> Amuleto anti-Shiker. Cem por cento eficaz. Trezentas moedas.
>
> → *"Cem por cento eficaz mesmo?"*
> Absolutamente. Eu uso um há doze anos e nunca fui atacado por um Shiker.
> ...eu também nunca saí da praça. Mas isso é irrelevante.
> Está bem. Guarde suas moedas. Vou te dar algo melhor de graça: informação.
> Madeira e pedra boa ficam na floresta a leste. E ande com a bolsa fechada por lá.

## Cena 5 — A Ponte Quebrada (voltando ao Antony)

> **Antony**: E então? Sobreviveu ao Lucian?
> **Personagem**: Ele cantou três músicas. Eu pedi uma.
> **Antony**: Você saiu barato. Semana passada eu levei sete.
> **Personagem**: E o Tibério tentou me vender um amuleto.
> **Antony**: O anti-Shiker? Ele tem quatorze. Vai morrer com quatorze.
>
> *(missão Amizade Importa concluída)*
>
> **Antony**: Muito bem, [seu nome]. Agora você tem rosto nesta cidade.
> **Antony**: E quem tem rosto aqui, ajuda.
> **Antony**: Falta você conhecer o Ferreiro Dorn. Ele fica lá embaixo, nos Portões Reais.
> **Antony**: A ponte da entrada cedeu na última chuva. Ele está encarando o buraco desde ontem.
> **Personagem**: Eu vou me apresentar a ele.
> **Antony**: Vá. Mas escute o conselho de um velho:
> **Antony**: Não chegue de mãos vazias. O Dorn não aperta mão, ele avalia carga.
> **Antony**: Passe antes na floresta a leste da praça. Traga madeira e pedra.
> **Antony**: Aparecer lá já com o material é o jeito mais rápido de virar amigo dele.
> **Antony**: E [seu nome]... se ouvir silêncio absoluto lá dentro, volte correndo.

### 🏆 MISSÃO 2 — A Ponte Quebrada
- ☐ Colete madeira na floresta (0/6)
- ☐ Colete pedra na floresta (0/4)
- 🔒 Leve o material ao Ferreiro Dorn
- Recompensa: 140 XP + 120 moedas · Consome 6 madeiras e 4 pedras

## Cena 6 — O Martelo do Aprendiz (Portões Reais)

> **Dorn**: Opa. Você trouxe material.
> **Dorn**: Madeira boa. Pedra melhor ainda. O Antony te avisou direitinho.
> **Personagem**: É tudo seu. Pode consertar a ponte.
> **Dorn**: Consertar? Eu?
> **Dorn**: Rapaz, eu tenho sessenta anos e uma coluna de quarenta.
> **Dorn**: Eu ensino. Você bate.
> **Personagem**: ...
> **Dorn**: Não faça essa cara. Todo ferreiro desta cidade começou exatamente aí.
> **Dorn**: Primeira lição: ninguém conserta ponte com a mão.
> **Dorn**: Você vai forjar o seu próprio martelo. Na minha forja, ali atrás.
> **Dorn**: Guardei madeira e pedra suficientes para o primeiro. Considere um presente.
> **Dorn**: Segunda lição, e preste atenção nessa:
> **Dorn**: Metal tem compasso. Bata fora do tempo e você tem um pedaço de ferro torto.
> **Dorn**: Bata no compasso e você tem uma ferramenta que canta.
> **Dorn**: E o metal esfria enquanto você pensa. Então não pense muito.
> **Personagem**: Bater no compasso. Antes de esfriar.
> **Dorn**: Isso. Vai lá. Entre na ferraria e use a bigorna.

### 🏆 MISSÃO 3 — O Martelo do Aprendiz
- ☐ Forje o Martelo do Ferreiro na bigorna *(minigame de ritmo)*
- 🔒 Mostre o martelo ao Ferreiro Dorn
- Recompensa: 120 XP + 80 moedas

## Cena 7 — Braço a Braço (Portões Reais)

> **Dorn**: Deixa eu ver isso.
> **Dorn**: Cabo firme. Cabeça bem assentada.
> **Dorn**: Você bateu no compasso, não bateu? Dá para ouvir.
> **Personagem**: Tentei não pensar muito.
> **Dorn**: Ha! É exatamente esse o segredo. Levei quinze anos para aprender.
> **Dorn**: Muito bem, aprendiz. Agora vem a parte que dói.
> **Dorn**: A ponte. Você e eu. Agora.
> **Dorn**: Eu seguro a viga e mostro onde bater. Você bate até aquilo virar ponte de novo.
> **Personagem**: E a sua coluna?
> **Dorn**: Minha coluna supervisiona.
> **Dorn**: Vamos. Fica do meu lado e acompanha o ritmo.

Os dois **caminham juntos até o ponto de martelada**.

> **Dorn**: Aqui. Bate firme e não para até eu mandar.

### 🏆 MISSÃO 4 — Braço a Braço
- ☐ Martele a ponte ao lado do Ferreiro Dorn (0/10)
- Recompensa: 180 XP + 150 moedas

Cada martelada solta fagulhas e som de bigorna, e o Dorn martela junto gritando
"Isso!", "Mais uma!", "No compasso!", "Firme!".

## Cena 8 — A Ponte de Pé (automática ao terminar)

> **Dorn**: PARA! Para, para.
> **Dorn**: Acabou. Está de pé.
> **Personagem**: Meus braços não acabaram.
> **Dorn**: Amanhã acabam. Depois de amanhã você agradece.
> **Dorn**: Olha só isso. Quarenta anos essa ponte serviu Acordelot.
> **Dorn**: Vai servir mais quarenta. E parte dela agora é sua.
> **Dorn**: Chegou aqui ontem sem lembrar do próprio nome, e já deixou marca na cidade.
> **Personagem**: Não foi só eu.
> **Dorn**: Não. Nunca é.
> **Dorn**: Agora suma daqui e vá falar com o Sr. Antony.
> **Dorn**: Ele vai querer saber de tudo. E vai fingir que já sabia.
> **Dorn**: E [seu nome]... guarda bem esse martelo. Ele ainda vai abrir portas.

---

# PRÓXIMO ARCO — Magia por Escalas (desenhado, não implementado)

Ver `assets/magia_design.md`. Resumo: matar mobs dropa **Fragmentos de Nota** →
sintetizar as 12 notas da cromática → coletar **Tons e Semitons** → montar uma escala
maior (T T S T T T S) no **Forjador de Escalas** → escolher acordes do campo harmônico
para o arsenal. Cada acorde é um feitiço cuja função **é** a função harmônica real:
I estabiliza e cura, V é o grande ataque tenso, vii° atordoa por ser dissonante.
A cadência V→I dá bônus.

Sprites: 11 dos 13 já gerados. Faltam `fx_relativa_menor` e `fx_sensivel`.

---

# DEPLOY

```
python3 build.py
```

Gera `dist/` auto-contido. Suba essa pasta na Vercel.

O que foi corrigido para o celular funcionar:
- **As cenas não estavam sendo copiadas** para o build. Era por isso que o jogo publicado
  não tinha história nenhuma.
- **Menu inicial no build publicado**: sem o cabeçalho do editor, não havia como escolher
  nome, herói nem começar. Agora o menu abre sozinho.
- **Botão "Continuar de onde parei"** quando existe progresso salvo.
- **Progresso completo no localStorage**: nome, herói, inventário, missões e objetivos,
  ferramentas e qualidades, mapa e posição, vida, cenas já vistas. Salva a cada 8
  segundos e sempre que a aba perde o foco.
- **Marca de versão** em `game.js` e `style.css` a cada build, para o celular do aluno
  não continuar rodando a versão antiga depois de um deploy novo.
- **Menu compacto** em paisagem de celular, com o botão de começar sempre visível.
