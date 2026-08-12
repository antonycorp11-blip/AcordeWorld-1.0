# Prompt — Almas de Eco Musical

Item novo, o que fecha o laço da economia: capturar um Eco na Clareira dá a **Alma** da
nota dele; cinco almas da mesma nota fazem nascer um Eco na fazenda. São **sete**, uma por
nota, e a nota tem de ser reconhecível **pela cor**, porque é assim que o jogo já fala.

Hoje o item existe e funciona — aparece como `✦` com o nome da nota. Só falta a arte.

## As cores já usadas no jogo (`COR_DA_NOTA` em `game.js`)

| Nota | Cor | Temperamento do Eco (o que a alma deve sugerir) |
|---|---|---|
| Dó | `#f87171` vermelho coral | firme, fica onde está |
| Ré | `#fb923c` laranja | inquieto, nunca para |
| Mi | `#fbbf24` amarelo âmbar | flutuante, arcos largos |
| Fá | `#4ade80` verde | puxa sempre para um lado |
| Sol | `#22d3ee` ciano | agitado, cobre terreiro |
| Lá | `#818cf8` indigo | melancólico, roda em círculos |
| Si | `#f472b6` rosa | esquivo, foge de perto |

## Regra técnica — cole no prompt

> Pixel art item icons on a solid pure **GREEN** background (#00FF00), nothing else in the
> background. Crisp pixel edges, no blur, no glow spill onto the background. Items in a
> clean uniform grid with generous even spacing, each fully inside its own cell, never
> touching. No text, no labels, no numbers, no watermark, no frame.

**Fundo verde, não magenta.** O recorte do projeto usa `mag = min(R,B) − G`: o selo de Lá
é indigo e o de Si é rosa, e os dois foram **comidos pelo fundo magenta** na leva
anterior — tive de girar matiz a partir do selo de Sol para ter os dois. Verde não colide
com nenhuma das sete cores acima.

## O prompt

> …**Content: a 4×2 grid of 7 "soul" icons for a music-fantasy RPG, plus one empty
> socket.** Each soul is a small floating wisp of light shaped like a musical note head
> with a soft comet-like tail curling beneath it, as if the note itself had become a spirit.
> Inside each one, a faint spiral core. Each is a single strong color, in this order:
> coral red, orange, amber yellow, green, cyan, indigo, pink. Same silhouette and same size
> for all seven so they read as one set; only the color and the curl of the tail change —
> the red one is compact and still, the pink one is stretched as if fleeing, the indigo one
> curls into a closed loop, the cyan one is jagged and restless.
> Last cell: an empty dark crystal socket, unlit, waiting to receive one.
> Chunky readable icon shapes, strong silhouettes, 64×64 each.

## Depois de gerar

1. Salve em `assets/folhas_fazenda/` e me diga — eu recorto e ligo.
2. Os arquivos vão para `assets/itens/almas/<nota>.png` (`do.png` … `si.png`).
3. Uma linha em `nomeDoItemColetado` troca o `ico: '✦'` por `arte:` e o item passa a
   aparecer com a arte no relatório da corrida e na barra de invocar.
