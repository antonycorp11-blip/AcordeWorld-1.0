# Prompts dos cenários — v2, com continuidade de estilo

Os primeiros resultados fugiram do estilo porque o prompt descrevia o *lugar* e não o
*jogo*. Agora existe um bloco de estilo obrigatório: **cole ele em TODO prompt, antes da
descrição do cenário.** É ele que garante que o jogador não sinta que trocou de jogo ao
atravessar uma placa.

---

## BLOCO DE ESTILO — copie sempre

> Detailed 2D pixel art game background for a top-down RPG, seen from a high 3/4 angle
> (camera looks down at roughly 60 degrees, never straight down, never side-on).
> Aspect ratio 16:9, wide. Render it large and sharp.
>
> STYLE: cozy storybook fantasy, in the tradition of Stardew Valley and classic SNES JRPG
> town maps. Clean readable pixel clusters, visible pixel grid, crisp edges, NO blur, NO
> painterly brush strokes, NO photo texture, NO 3D render, NO cel-shaded anime look.
> Saturated but natural colors: warm greens, warm browns, honey-colored stone, deep blue
> roof tiles. Soft dark outlines around major objects so they read against the ground.
>
> LIGHTING — this is mandatory: bright NEUTRAL MIDDAY DAYLIGHT, sun high, light coming
> from the upper left, short soft shadows. Do NOT make it night, dusk, dawn, moonlit,
> foggy, stormy or orange sunset. The scene must look like clear midday even if the place
> is meant to feel sad or dangerous — mood comes from what is IN the scene, never from the
> color of the light.
>
> SCALE: this is a playable map where a small human character about 40 pixels tall will
> walk around. Doors, steps, benches, fences and paths must all be sized for that
> character. Paths must be at least three times wider than that character. Nothing
> gigantic, nothing miniature.
>
> COMPOSITION: the middle of the image is OPEN and WALKABLE. Keep trees, cliffs, walls and
> buildings around the borders, framing the play area. Clear paths connect the edges of
> the image so the map can link to neighbouring maps.
>
> NO text, no letters, no numbers, no UI, no HUD, no watermark, no logo, no signature,
> no characters, no people, no animals, no border or frame around the image.

**Por que luz de meio-dia:** o jogo escurece o cenário por código, com a camada de
ambiente e o ciclo de dia e noite. Se a imagem já vem de noite, não há como clarear — o
cenário fica preso num horário só e não combina com o vizinho.

---

## 1. Salão do Forjador de Escalas — o mais urgente

Três cenas acontecem aqui e hoje não existe caminho até ele.

> …Interior of a huge ancient stone hall, roofless in places so bright midday sun falls in
> wide shafts across the floor. Against the far wall stands a semicircular arch of twelve
> crystal sockets set into carved stone, like a stone harp built into the wall — seven of
> the crystals are lit amber, five are dull and dark. In front of the arch, a low circular
> altar of pale stone with concentric grooves cut into it.
>
> Worn flagstone floor with a spiral of inlaid brass lines running toward the altar.
> Broken columns along both sides, moss and small plants growing in the cracks, a wide
> open floor in the middle. It should look far older than the city outside, built by
> people who understood something everyone has forgotten.

## 2. Clareira dos Ecos

Onde a captura de Ecos acontece.

> …A wide forest clearing at midday, open grass in the middle, ringed by tall old trees
> whose trunks lean slightly inward. Small still ponds reflecting the sky, pale mushrooms
> growing in perfect rings, tall grass pressed flat in curving trails as if something just
> moved through it. Several weathered standing stones carved with musical staff lines,
> half covered in moss. Sunny and green and quiet — the strangeness comes from the shapes,
> not from darkness.

## 3. Floresta Sombria — território dos Dissonantes

Aqui o lugar é **habitado**, não vazio. É o contrário da Clareira.

> …A dense dark-green forest under bright midday sun that barely reaches the ground, seen
> from above. A wide dirt path cuts through the middle from bottom to top. This forest is
> LIVED IN: rope bridges strung between the trunks, wooden platforms built high in the
> trees, lanterns with red glass hanging at uneven heights, territory marks carved into
> bark. A broken lute and a cracked drum hang from branches as warnings. Deep green and
> violet-brown wood tones, with red lanterns as the only strong accent. Dangerous, but
> clearly someone's home.

## 4. Interior da casa da Mirela

> …Small rustic one-room cottage interior seen from above at a 3/4 angle, bright daylight
> coming through an open window and an open door. A straw bed with a folded wool blanket,
> a stone hearth, a wooden table with a clay bowl, bunches of herbs hanging from the
> ceiling beams, a broom against the wall, a woven rug on the packed-earth floor. Poor,
> clean, warm and safe. Open floor space in the middle.

## 5. A Fazenda — ilha modular

Nova, para o sistema de fazendinha.

> …A floating island seen from above at a 3/4 angle, bright midday sun. Lush green grass
> on top, and the edges of the island fall away into a cliff of brown earth and pale rock,
> with the sky visible all around it. On the island: flat open buildable ground in the
> middle, a small dirt path, a well, and a few scattered rocks and flowers near the edges.
> Leave most of the surface EMPTY and flat — this is where the player will build. A small
> wooden dock juts out from one edge where a bridge could connect to another island.

## 6. Classiquia — para o corte final do capítulo

> …An enormous hall of white stone and gold, seen from above at a 3/4 angle, flooded with
> bright cold daylight. Impossibly clean and perfectly symmetrical. Tall arches, a floor
> polished like a mirror, floating horizontal lines of light along the walls like the
> lines of a musical staff. Everything beautiful and nothing comfortable. White, pale
> gold, and thin blue shadows.

---

## Como conferir se ficou no estilo

Antes de importar, ponha a imagem nova lado a lado com a **praça de Acordelot**
(`assets/cenarios/mapas/bg_custom_1785869541494_557.jpg`). Três perguntas:

1. O tamanho de uma porta é o mesmo nas duas? Se a porta nova é o dobro, a escala fugiu.
2. A luz vem do mesmo lado e tem a mesma força?
3. Se você colasse metade de uma na outra, pareceria o mesmo mundo?

Se falhar em qualquer uma, é regerar — sai mais barato que descobrir depois com o jogo
montado em cima.

## Depois de gerar

1. Salve em `assets/cenarios/mapas/` como `bg_<nome>.jpg`.
2. No editor, importe e **posicione na grade do Mapa-Múndi**.
3. Crie a **placa** ligando ao vizinho, nos dois sentidos.
4. `python3 ferramentas/alcance.py` diz na hora se ficou conectado.
