# Prompts da Arena — monstros exclusivos, pedras de evolução e cenários por patente

A arte vem antes do código, como combinado. O que está aqui é o que a Arena precisa para
existir como **destino**, e não como placar: bicho que só mora nela, a pedra que só cai
nela, e um chão que muda conforme o jogador sobe de patente.

Três levas, na ordem em que o código vai precisar delas:

1. **Pedras de evolução** — é o item que dá razão para a Arena existir. Uma imagem só.
2. **Monstros exclusivos** — cinco folhas.
3. **Cenários por patente** — cinco fundos.

Os chefes de banner ficam para depois: personagem jogável segue o molde do
`PROMPT_SPRITES_ACHILLES.md`, e não vale gerar antes de o personagem estar decidido.

---

## LEVA 1 — Pedras de evolução dos Ecos

O Eco evolui em três formas. A pedra é o que destrava a passagem, e **só cai na Arena** —
é a decisão que sustenta o modo inteiro. São **quatro** pedras, e a diferença entre elas
é o que o jogador está subindo, não a nota:

| Pedra | Para quê |
|---|---|
| **Pedra de Tônica** | forma 1 → forma 2, dos sete Ecos naturais |
| **Pedra de Dominante** | forma 2 → forma 3, dos sete Ecos naturais |
| **Pedra de Alteração** | a que os sustenidos pedem, nas duas passagens |
| **Pedra de Cadência** | a rara, do último degrau — a que faz o jogador voltar |

Uma imagem só, grade 2×2. Não repita a leitura das Almas de Eco: alma é **luz difusa**,
pedra é **mineral, com faceta e peso**. Se as duas ficarem parecidas, o jogador confunde
no inventário, e o inventário é onde ele decide o que fazer com a tarde dele.

> Pixel art item icons on a solid pure **GREEN** background (#00FF00), nothing else in the
> background. Crisp pixel edges, no blur, no glow spill onto the background. Items in a
> clean uniform 2×2 grid with generous even spacing, each fully inside its own cell, never
> touching. No text, no labels, no numbers, no watermark, no frame.
>
> **Content: four cut gemstones for a music-fantasy RPG, each about the size of a fist,
> faceted like a hand-cut crystal with clear flat planes and a bright specular highlight in
> the upper left.** Each stone has a musical symbol embedded and glowing faintly inside it,
> visible through the facets:
> (1) a deep amber-gold stone, rounded and heavy, with a solid filled note head inside;
> (2) a cyan-blue stone, sharp and angular, with a treble clef inside;
> (3) a violet stone, irregular and asymmetric with one chipped facet, with a sharp sign
> (♯) inside;
> (4) a rose-white stone, the most elaborate, ringed by a thin gold band, with a fermata
> arc inside, and a few tiny loose sparks orbiting close to it.
> Same lighting and same pixel density on all four so they read as one set. Chunky readable
> pixel clusters, strong dark outline around each stone.

**Depois de gerar:** `python3 ferramentas/recortar_hud.py` não serve aqui — ele corta por
banda. Para grade de item o recorte é o de sempre, fundo verde, e eu ligo os quatro no
inventário.

---

## LEVA 2 — Os cinco monstros exclusivos da Arena

Bichos que o mundo não tem. A ideia que os une: **na Arena, a música virou competição** —
são criaturas de plateia, de palco e de julgamento, não de floresta. Isso os separa dos
Dissonantes na primeira olhada, que é o que importa.

| # | Nome | O que é | Onde entra |
|---|---|---|---|
| 1 | **Claque** | massa de mãos batendo palma, sem corpo | patente baixa, o mais comum |
| 2 | **Metrônomo Carrasco** | metrônomo alto de pêndulo em lâmina | patente baixa |
| 3 | **Vaia** | boca aberta feita de fumaça, arrasta som | patente média |
| 4 | **Juiz de Compasso** | figura togada com batuta e balança | patente alta |
| 5 | **Coroa Rachada** | coroa flutuante partida, com voz | o mais raro, larga a Pedra de Cadência |

Cada um é **uma folha**, no mesmo molde exato dos Ecos que já estão no jogo:

| | |
|---|---|
| Folha | **1000 × 1000 px** |
| Grade | **5 colunas × 4 linhas** |
| Célula | **200 × 250 px** |
| Linha 0 | parado · Linha 1 | andando · Linha 2 | atacando · Linha 3 | morrendo |

> Pixel art sprite sheet for a 2D top-down RPG, **transparent background (alpha), no
> background colour of any kind**. Exactly **5 columns by 4 rows**, each cell exactly
> 200×250 px, creature centered in its cell and standing on the cell's bottom edge, same
> size in every single cell. Row 1: idle, 5 frames of a small breathing loop. Row 2:
> walking toward the viewer, 5 frames. Row 3: one attack, 5 frames, wind-up to follow
> through — **the creature must be fully visible in all 5 attack frames; never replace it
> with an effect, a beam or an explosion.** Row 4: defeat, 5 frames, coming apart into
> motes of light.
>
> STYLE: cozy storybook fantasy pixel art, SNES JRPG monster, saturated but natural colors,
> crisp pixel edges, visible pixel grid, soft dark outline. NO blur, NO painterly strokes,
> NO 3D render, NO anime cel-shading. Neutral even lighting from the upper left. No text,
> no numbers, no UI, no frame, no ground shadow baked in.
>
> **Content:** *(uma destas por geração)*
>
> 1. **Claque** — a hovering cluster of six disembodied pale hands frozen mid-applause,
>    orbiting a small dark hollow where a body should be; ragged cuffs of purple velvet at
>    each wrist. It attacks by clapping the hands together into one shockwave.
> 2. **Metrônomo Carrasco** — a tall lacquered-wood metronome standing on two stubby brass
>    feet, its pyramid case scratched, its pendulum a thin curved blade instead of a rod,
>    one round brass eye where the winding key would be. It attacks by swinging the blade
>    pendulum in a wide arc.
> 3. **Vaia** — a wide open mouth made of grey-green smoke, no head around it, trailing a
>    long smeared tail of sound behind it like a comet; crooked teeth of dull ivory. It
>    attacks by opening impossibly wide.
> 4. **Juiz de Compasso** — a stern robed figure in deep navy academic robes, face hidden
>    in shadow under a flat cap, holding a white conductor's baton in one hand and a small
>    brass balance scale in the other. It attacks with a downbeat of the baton.
> 5. **Coroa Rachada** — a floating golden crown, split by a deep crack down one side,
>    with dim red light burning in the hollow beneath it and a torn crimson mantle hanging
>    where a body should be. It attacks by tipping forward and pouring red light.

**Depois de gerar:** `python3 ferramentas/montar_folha_de_eco.py <folha.png> <nome>` —
serve para qualquer bicho, não só para Eco. Ele desmonta e remonta na grade 5×4 com o pé
ancorado, e a régua sai da linha parada, que nunca tem efeito.

---

## LEVA 3 — Os cinco cenários de patente

O chão muda conforme o jogador sobe. É a recompensa que ele vê antes de qualquer número:
sabe que subiu porque a Arena ficou outra.

**Cole o BLOCO DE ESTILO do `PROMPT_CENARIOS.md` antes de cada um** — inclusive a parte da
luz de meio-dia, e inclusive aqui. As duas florestas noturnas ensinaram: cenário que já
nasce escuro não tem como clarear, e fica preso num horário só.

O que muda de um para o outro é **material e plateia**, nesta ordem crescente:

1. **Aprendiz** — pátio de terra batida, cercado de tábuas tortas, alguns bancos de pedra
   vazios, varais de bandeirola de pano puídas. Sem público.
2. **Corista** — arena de madeira encerada com arquibancada baixa de dois degraus, cordas
   de veludo, tochas apagadas nos cantos. Poucos bancos ocupados ao fundo, longe.
3. **Solista** — piso de mármore claro com o círculo das sete notas embutido em pedra
   colorida, colunas de pedra mel em volta, estandartes azuis.
4. **Maestro** — anfiteatro de pedra branca com degraus altos em volta, um órgão de tubos
   gigante encostado na parede do fundo, o chão com marchetaria de pauta musical.
5. **Regente Eterno** — plataforma de pedra clara flutuando no céu aberto, sem paredes,
   com lascas de rocha suspensas ao redor e um arco de aurora atrás; o círculo das sete
   notas brilhando no chão.

Em todos: **o meio fica aberto e vazio**, é onde a briga acontece. Público, coluna e
móvel ficam na borda.

---

## O que eu faço quando a arte chegar

Leva 1 entra em um dia: item no inventário, tabela de queda, e o `evoluirPet` — que já
está escrito e nunca foi chamado — passa a ter de onde tirar a pedra.

Leva 2 entra pela mesma porta dos Ecos: `montar_folha_de_eco.py`, registro em
`assets/monsters`, e o encontro por patente.

Leva 3 pede também as entradas no `gridPos` — cenário fora dele é ilha, e o `alcance.py`
acusa. Arena não se anda até, mas o registro tem de existir de qualquer forma.
