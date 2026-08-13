# Prompt — folhas de sprite dos Ecos que faltam

**A arte dos bichos já está pronta e não se discute aqui.** Este prompt não descreve
criatura nenhuma: ele descreve a **folha**. Você entrega o desenho do Eco como referência e
pede as poses; o gerador não inventa design, só anima o que você deu.

São **17 folhas**: as formas 2 e 3 dos sete Ecos naturais (14) e as três formas dos cinco
sustenidos (15) — menos as que você já tiver. Cada uma segue exatamente o mesmo molde das
sete que já estão no jogo, medido delas:

| | |
|---|---|
| Folha | **1000 × 1000 px**, PNG com transparência real (sem fundo chroma) |
| Grade | **5 colunas × 4 linhas** |
| Célula | **200 × 250 px** |
| Linha 0 | parado (idle) |
| Linha 1 | andando |
| Linha 2 | atacando |
| Linha 3 | morrendo / dissipando |
| No jogo | desenhado com ~54 px de altura |

O motor lê `cols: 5, rows: 4, idleRow: 0, walkRow: 1, attackRow: 2, deathRow: 3`. Qualquer
folha fora dessa grade entra torta e não tem conserto por código.

---

## O bloco técnico — cole em TODA geração

> Pixel art sprite sheet for a 2D top-down RPG, **transparent background (alpha), no
> background colour of any kind**. Exactly **5 columns by 4 rows**, each cell exactly
> **200×250 pixels**, total canvas exactly **1000×1000 pixels**.
>
> The character must be **centred horizontally in its cell** and **stand on the same
> baseline in every single frame** — the feet/base must not drift up or down between
> frames or between rows. Keep the same distance from the top of the cell in all idle
> frames.
>
> Row 1 (top): IDLE — 5 frames of a gentle breathing/floating loop, frame 5 reads back into
> frame 1 seamlessly.
> Row 2: WALK — 5 frames of a walk/drift cycle, also looping seamlessly.
> Row 3: ATTACK — 5 frames of one attack, from wind-up to strike to recovery.
> Row 4: DEATH — 5 frames dissipating into light and fading out; the last frame is nearly
> gone.
>
> Crisp pixel edges, visible pixel grid, no anti-aliasing halo, no blur, no drop shadow on
> the background, no outline box around cells, no grid lines drawn, no text, no numbers,
> no watermark, no colour swatches, no extra characters.
>
> **Do not redesign the character.** Match the reference exactly: same silhouette, same
> palette, same proportions, same details. Only the pose changes between frames.

---

## Como pedir cada folha

Anexe **a arte pronta daquele Eco** e escreva só isto depois do bloco técnico:

> Use the attached character exactly as designed. Generate the sheet described above for
> this exact creature.

Nada mais. Qualquer frase descrevendo o bicho abre espaço para o gerador reinterpretar — e
o que você quer é a sua arte animada, não uma versão dela.

---

## As três formas

As formas 2 e 3 são **o mesmo Eco crescido**, não bichos diferentes. Se você já tem a arte
das três, gere uma folha por forma, cada uma com a sua referência.

O jogo já trata a diferença de tamanho por conta própria (`escala` 1.00 / 1.18 / 1.38 no
`pets.json`), então **não aumente o personagem dentro da célula** para sugerir evolução —
isso aplicaria o crescimento duas vezes. A forma maior ocupa a mesma célula; o que muda é o
desenho.

---

## Nomes dos arquivos

O motor já procura por estes caminhos. Salvar com o nome certo é a única coisa que falta
para eles entrarem sem eu tocar em código:

```
assets/monsters/eco_do.png       ← forma 1, já existe
assets/monsters/eco_do_f2.png    ← forma 2
assets/monsters/eco_do_f3.png    ← forma 3
```

As sete naturais: `do re mi fa sol la si`
As cinco sustenidas: `do_s re_s fa_s sol_s la_s` — e a forma 1 delas também é nova
(`eco_do_s.png`), porque hoje elas usam emprestada a folha da natural vizinha.

**Ordem que eu sugiro**, se for gerar aos poucos: primeiro as **cinco sustenidas na forma
1**. São as que estão com arte emprestada agora e as únicas que o jogador encontra no
mundo (à noite, na clareira). As formas 2 e 3 só aparecem depois que ele evolui um pet, o
que é bem mais tarde.

---

## Quando os arquivos chegarem

Me diga e eu faço, sem você mexer em nada:

1. Confiro cada folha na grade 5×4 e meço a linha de base quadro a quadro — folha que
   flutua faz o bicho subir e descer no chão, e isso não dá para ver olhando a imagem
   inteira.
2. Registro os tipos das sustenidas apontando para a arte real e apago o `provisorio` e o
   `sprite_desejado`.
3. Ligo a troca de folha por forma: hoje evoluir muda escala e força, mas o desenho
   continua o mesmo — é só isso que falta para a evolução aparecer na tela.
