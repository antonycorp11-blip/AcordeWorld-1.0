# Prompt — folhas de sprite do Huans, Clã das Cordas

**A arte dele já existe e não se discute aqui.** Este arquivo não descreve o personagem:
descreve as **folhas**. Você entrega o desenho do Huans como referência de imagem e pede as
poses; o gerador não inventa design, só anima o que você deu.

São **treze folhas**: sete do personagem e seis de efeito de habilidade. Todas seguem o
mesmo molde do Akles e da Wins, medido das folhas deles — é isso que impede o herói de
mudar de tamanho ao trocar de personagem ou de golpe.

---

## O molde, medido das folhas que já estão no jogo

| | |
|---|---|
| Fundo | **transparência real (alfa)**, sem cor de fundo de espécie nenhuma |
| Linhas | **4**, sempre nesta ordem: frente · costas · perfil esquerdo · perfil direito |
| Colunas | **6 a 8**, iguais em toda a folha |
| Corpo | **124 px** de altura (pés → topo da cabeça), **igual em todas as treze folhas** |
| Pés | na **mesma linha** dentro da célula, em toda célula de toda folha |
| No jogo | desenhado com ~45 px de altura |

As duas medidas em negrito são as que mais custam quando erram. O motor escala por
`altura_do_herói ÷ corpo` e ancora pelos **pés**: se o corpo mudar de folha para folha, o
Huans cresce e encolhe ao trocar de golpe; se a linha dos pés mudar, ele flutua e afunda.

**Perfil esquerdo e direito são desenhos próprios, não espelho.** O machado-guitarra fica
do mesmo lado do corpo nas duas, e um espelhamento o jogaria para a mão errada.

---

## BLOCO TÉCNICO — cole em TODA geração

> Pixel art sprite sheet for a 2D top-down RPG seen from a high 3/4 angle, **transparent
> background (alpha), no background colour of any kind, no checkerboard, no shadow baked
> into the sheet**.
>
> LAYOUT: exactly **4 rows**. Row 1 facing the camera (front), row 2 facing away (back),
> row 3 facing left in profile, row 4 facing right in profile. Every row has the SAME
> number of frames, evenly spaced, each frame in its own cell of identical size. Left and
> right profiles are drawn separately, not mirrored — the weapon stays on the same side of
> the body in both.
>
> SCALE — this is mandatory: the character's body is **exactly the same height in every
> single cell of every sheet**, and the feet rest on the **same horizontal line** in every
> cell. Never crop the weapon; enlarge the cell instead of shrinking the character.
>
> STYLE: cozy storybook fantasy pixel art in the tradition of SNES JRPGs. Crisp pixel
> edges, visible pixel grid, saturated but natural colours, soft dark outline so the figure
> reads against any ground. NO blur, NO painterly brush strokes, NO photo texture, NO 3D
> render, NO anime cel-shading. Neutral even lighting from the upper left.
>
> Keep the character EXACTLY as in the reference image: same colours, same proportions,
> same equipment, same silhouette. Change only the pose.
>
> No text, no letters, no numbers, no UI, no frame, no border, no watermark, no signature.

---

# LEVA 1 — as sete folhas do personagem

Uma geração por folha. Sempre com o bloco técnico acima antes.

### 1. `huans_caminhada` — 8 colunas
> **Content: a walk cycle, 8 frames per row.** A full stride: contact, passing pose,
> lift, contact on the other foot, and back. The weapon is carried and swings slightly with
> the stride. Natural walking, not running, not marching.

### 2. `huans_parado` — 6 colunas
> **Content: an idle breathing loop, 6 frames per row**, returning to the first frame so it
> loops seamlessly. Chest rises and falls, weight shifts a little, the weapon hangs. **The
> feet do not move and do not leave the ground** — only the upper body breathes.

### 3. `huans_guarda` — 6 colunas
> **Content: a combat-ready guard loop, 6 frames per row**, looping seamlessly. Knees
> slightly bent, weapon raised and held ready across the body, weight forward. It is a
> loop, not a strike: the pose breathes but never swings.

### 4. `huans_corte` — 6 colunas
> **Content: one horizontal slash, 6 frames per row**, running from wind-up to follow
> through: the weapon is drawn back, swings across the body, and settles. The character is
> fully visible in all 6 frames. Any motion trail stays close to the weapon and never
> replaces the body.

### 5. `huans_vertical` — 6 colunas
> **Content: one overhead downward strike, 6 frames per row**: the weapon is raised high
> above the head, comes down hard, and the pose settles low. Make the cell **taller** to fit
> the raised weapon — do NOT shrink the character to make it fit.

### 6. `huans_estocada` — 6 colunas
> **Content: one forward lunging thrust, 6 frames per row**: a step forward with the front
> leg, the weapon driven straight ahead at full extension, then the recovery back to stance.
> The lunge reaches forward — make the cell **wider**, never smaller character.

### 7. `huans_giro` — 8 colunas
> **Content: one full 360° spinning attack, 8 frames per row**, the weapon sweeping all the
> way around the body and back to the starting side. In the frames where the character
> turns away from the camera, draw the back — do not skip frames or fade the body out.

---

# LEVA 2 — as seis folhas de efeito

Estas **não têm personagem nenhum**. São o efeito solto, desenhado sobre transparência, que
o motor sobrepõe ao herói. Separar assim é o que permite o mesmo efeito servir a qualquer
personagem e o herói continuar visível por baixo — quando o efeito vem colado na criatura,
o golpe termina com um feixe de luz no lugar do lutador.

Molde diferente do de cima:

| | |
|---|---|
| Fundo | transparência real (alfa) |
| Grade | **1 linha × 8 colunas** (só a animação, sem direções) |
| Célula | quadrada, **256 × 256 px** |
| Leitura | do quadro 1 (nasce) ao 8 (dissipa), sem laço |

> Pixel art **visual effect** sprite sheet for a 2D top-down RPG, **transparent background
> (alpha), no character, no creature, no ground, no scenery — the effect alone**. Exactly
> **1 row by 8 columns**, each cell exactly 256×256 px, the effect centred in its cell.
> Frame 1 is the effect being born, frame 8 is it dissipating; it does not loop. Crisp pixel
> edges, visible pixel grid, soft glow, additive-looking light. NO blur, NO 3D render, NO
> text, NO frame.

O Clã das Cordas dá o vocabulário: **corda, vibração, ressonância e harmônico**. Os seis
efeitos abaixo são o que o motor já sabe usar — dois de aura, dois de golpe, um de área e
um de apoio.

### 8. `fx_aura_ressonancia` — aura que fica
> **Content: a standing aura that surrounds a character from the feet up.** A ring of
> concentric sound waves at ground level with faint vertical strands of light rising from
> it like plucked strings, each strand vibrating. Warm amber and gold. Frames 1–3 the ring
> forms and the strands rise, 4–6 they pulse steadily, 7–8 they fade. The centre stays
> **empty and transparent** so the character shows through.

### 9. `fx_aura_dissonancia` — aura de ameaça
> **Content: a standing aura of broken, jagged sound.** Same shape as above — ground ring
> plus rising strands — but the strands are snapped and frayed, whipping out of rhythm, with
> small dark cracks in the ring. Cold violet and deep magenta. Centre **empty and
> transparent**.

### 10. `fx_corte_corda` — o rastro do golpe horizontal
> **Content: a wide crescent slash trail, drawn as a taut string snapping.** A curved arc
> sweeping left to right, thick at the middle and tapering to nothing at both ends, with a
> single bright filament along its length and small sparks flying off. Amber-white core with
> a warm orange edge.

### 11. `fx_onda_harmonica` — a onda de área
> **Content: an expanding shockwave ring seen from a high 3/4 angle**, so it reads as a
> flattened ellipse on the ground, not a circle facing the camera. It starts small and tight
> in frame 1 and grows to fill the cell by frame 6, thinning as it grows. Two or three
> concentric rings chasing each other, like overtones. Cyan and white.

### 12. `fx_acorde_impacto` — o impacto que remata
> **Content: a burst at the point of impact.** Three vertical bars of light of different
> heights strike the ground together — a chord landing — throwing a short spray of sparks
> outward and a small dust ring at the base. Gold, with one bar in cyan and one in magenta
> so the three read as different notes.

### 13. `fx_afinacao` — o efeito de apoio
> **Content: a gentle upward effect.** Small note-shaped motes of light drift up from the
> ground in a loose column, growing brighter as they rise, with a soft ring of light at the
> base. Green and pale gold. Calm, not explosive — this is a buff, not a hit.

---

## Nomes dos arquivos

Salve exatamente assim, tudo minúsculo, sem espaço nem acento:

```
assets/personagens/herois/huans_caminhada.png
assets/personagens/herois/huans_parado.png
assets/personagens/herois/huans_guarda.png
assets/personagens/herois/huans_corte.png
assets/personagens/herois/huans_vertical.png
assets/personagens/herois/huans_estocada.png
assets/personagens/herois/huans_giro.png
assets/personagens/herois/huans_face.png      ← o retrato, se já tiver

assets/efeitos/fx_aura_ressonancia.png
assets/efeitos/fx_aura_dissonancia.png
assets/efeitos/fx_corte_corda.png
assets/efeitos/fx_onda_harmonica.png
assets/efeitos/fx_acorde_impacto.png
assets/efeitos/fx_afinacao.png
```

## O que eu faço quando chegarem

Meço o corpo e a linha dos pés de cada folha — **medindo o alfa, não chutando** — e escrevo
a ficha do Huans no `HERO_DEFINITIONS` com o combo de quatro golpes. Ele entra jogável e,
pelo mesmo caminho, entra na Arena como defensor: qualquer id com `folhas` e `combo` já é
desenhado com a folha própria, sem eu tocar em nada.

**Se alguma folha vier com o corpo de outro tamanho**, não ajusto no olho — as doze do Akles
e da Wins foram casadas por medição, e é por isso que os dois têm exatamente 124 px de
corpo. Existe ferramenta para recortar e recasar; o que não existe é chute que sobreviva ao
playtest.

## Ordem que eu sugiro gerar

1. **`huans_caminhada`** sozinha, primeiro. É a folha de referência: dela saem o corpo e a
   linha dos pés que todas as outras têm de respeitar. Se ela sair boa, o resto tem molde.
2. As outras seis do personagem.
3. Os seis efeitos — eles não dependem do personagem e podem ser gerados em paralelo, por
   você ou por outra pessoa, sem risco de divergir.
