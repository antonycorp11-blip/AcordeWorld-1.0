# Prompts dos cenários que faltam — para gerar no ChatGPT

**Proporção obrigatória: 1024 × 571 (16:9 largo, ~1.79).** Se a ferramenta não aceitar
esse tamanho, gere em 1792×1024 e eu redimensiono — o que não pode é vir quadrado.

**Regras que valem para TODOS os cenários abaixo.** Cole junto de cada prompt:

> Top-down pixel art game map, slight 3/4 tilt, 16:9 wide. Cohesive palette with the rest
> of a cozy-but-melancholic music-fantasy kingdom. Light comes from the upper left in
> every scene. The center must be OPEN AND WALKABLE — keep trees, rocks and buildings on
> the borders, framing the playable area. Paths are clearly readable as paths. No text,
> no letters, no UI, no watermark, no characters, no logo. Do not draw a frame or border
> around the image.

Existe uma razão prática para o "centro aberto": o jogo desenha personagens e objetos por
cima, e mapa cheio de detalhe no meio vira sopa visual.

---

## 1. Salão do Forjador de Escalas — o mais urgente

Três cenas acontecem aqui (o Altar, a Primeira Voz e o campo harmônico) e hoje não existe
caminho até ele. É o coração mecânico do capítulo.

> Interior of an ancient stone hall, top-down 3/4 pixel art, 16:9. Vast, older than the
> city around it. In the center-back stands a semicircular arch of twelve crystal sockets,
> like a stone harp built into the wall — seven sockets glow faintly, five are dark. Below
> the arch, a low circular altar of pale stone with concentric grooves.
>
> The floor is worn flagstone with a spiral of inlaid brass lines converging on the altar.
> Broken columns along the sides, moss in the cracks, shafts of cold daylight from high
> narrow windows. Dust suspended in the light.
>
> The place should feel like it was built before anyone remembers, by people who understood
> something the city has forgotten. Muted stone greys, cold blue light, and the only warm
> color is the faint amber inside the seven lit crystals.

---

## 2. Clareira dos Ecos

É onde a captura de Ecos acontece — o sistema mais bonito do jogo, hoje inalcançável.

> A forest clearing at dusk, top-down 3/4 pixel art, 16:9. Wide open grass in the middle,
> ringed by old trees whose trunks lean slightly inward as if listening.
>
> The clearing is unnaturally quiet-looking: still water in small pools that reflect no
> movement, pale mushrooms in ring formations, tall grass bent as if something just passed.
> A few weathered stone markers carved with musical staves, half-swallowed by moss.
>
> Palette: deep greens and blue-greys, with soft points of pale gold light floating low
> over the grass — like embers that never rise. Melancholic, not spooky. It should look
> like a place where something is still trying to finish a sentence.

---

## 3. Floresta Sombria — território dos Dissonantes

Fecha o capítulo. **Aqui a regra do "não é assustador" muda**: este lugar é habitado, não
vazio. É o contrário da Clareira — lá falta som, aqui há som errado.

> A dark forest, top-down 3/4 pixel art, 16:9. Dense black-green canopy, twisted trunks,
> a narrow dirt path cutting through the middle from bottom to top.
>
> This forest is INHABITED, not abandoned: rope bridges strung between trunks, lanterns
> with red-tinted glass hanging at uneven heights, a few crude wooden platforms high in
> the trees, carved marks on bark like territory signs. Instruments left hanging from
> branches — a broken lute, a cracked drum — as warnings, not decoration.
>
> Palette: deep violet-black, cold green, with red lantern light as the only warm accent.
> Dangerous and lived-in. Someone made a home here on purpose.

---

## 4. Interior da casa da Mirela

Hoje resolvido com fade para preto. Cena curta, mas é a única noite tranquila do capítulo.

> Small rustic cottage interior, top-down 3/4 pixel art, 16:9. One room. A straw bed with
> a folded blanket, a hearth with low embers, a wooden table with a clay bowl, herbs
> hanging to dry from the ceiling beams. Shutters closed against the night, with cold blue
> moonlight leaking through the slats and warm orange firelight from the hearth meeting in
> the middle of the floor. Cramped, poor, and safe.

---

## 5. Classiquia — só para o corte final (opcional agora)

Vale gerar mesmo sem usar ainda: é o gancho do Arco 2.

> A vast hall of white stone and gold, top-down 3/4 pixel art, 16:9. Impossibly clean and
> symmetrical. Floating staves of light instead of windows. The floor is polished to a
> mirror. Everything is beautiful and nothing is comfortable. Cold white, pale gold, and a
> sky visible above that is the wrong color for any sky.

---

## Depois de gerar

1. Salve em `assets/cenarios/mapas/` com nome descritivo (`bg_salao_forjador.jpg`).
2. No editor, importe o cenário e **posicione na grade do Mapa-Múndi** — cenário fora da
   grade é ilha, existe e ninguém chega.
3. Crie a **placa** ligando ao vizinho, nos dois sentidos.
4. Rode `python3 ferramentas/alcance.py` — ele diz na hora se ficou conectado.
