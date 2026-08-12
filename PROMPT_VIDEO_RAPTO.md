# Prompt — o vídeo do rapto

Só o **instante** do rapto, não a cena inteira. O diálogo antes (o Pipo mostrando o
compasso, os Dissonantes chegando) e o depois (o "que menino?", o palito no chão)
continuam jogáveis — é ali que a cena machuca, e machuca porque o jogador está lá.

O vídeo cobre os cinco segundos impossíveis de encenar: a praça perdendo o som, o menino
sumindo, e ninguém percebendo.

## Duração e formato

**8 a 10 segundos**, 16:9, sem áudio falado (a trilha entra por código). Se puder,
entregue também sem música — o jogo já escurece e desafina por conta própria.

## O prompt

> Pixel art animated cutscene, top-down 3/4 view, same style as a cozy SNES-era JRPG town
> map — clean readable pixel clusters, visible pixel grid, crisp edges, no blur, no
> painterly texture, no 3D, no anime shading.
>
> SCENE: a warm medieval town square at midday. A stone fountain in the middle, market
> stalls with striped awnings, cobblestone, flower boxes, a few townspeople standing
> around. Everything bright and ordinary.
>
> SHOT 1 (0–2s): the square, calm and full of colour. A small boy in a plain tunic stands
> near the right side, tapping a rhythm on a barrel with two drumsticks.
>
> SHOT 2 (2–5s): two tall dark figures in ragged black-and-violet cloaks stand near the
> fountain, perfectly still, faces hidden. As they stand there the COLOUR drains out of the
> square from the edges inward — the awnings, the flowers, the water all going grey — while
> the shapes stay sharp. The image begins to vibrate very slightly, like a held note going
> out of tune.
>
> SHOT 3 (5–7s): the screen shivers. The two dark figures are gone. The boy is gone. His
> two drumsticks are on the cobblestones where he was standing, one of them rolling to a
> stop.
>
> SHOT 4 (7–9s): colour floods back into the square. The townspeople are exactly where they
> were, talking, unbothered, as if nothing happened. Hold on the empty spot by the barrel
> with the two sticks on the ground.
>
> NO text, no letters, no subtitles, no UI, no HUD, no watermark, no logo, no camera shake
> at the end, no zoom on faces.

**O detalhe que carrega a cena inteira** é o Tiro 4: as pessoas continuam conversando. Não
é uma cidade em pânico — é uma cidade que **esqueceu**. Se o resultado mostrar reação,
regere: a indiferença é o horror.

## Depois de gerar

1. Salve em `assets/videos/` como `rapto.mp4`.
2. Me diga — eu encaixo. É uma linha no `cap1_rapto.json`, no lugar do trecho de tremor e
   legenda que hoje conta isso por atmosfera:

```json
{ "cmd": "video", "arquivo": "rapto.mp4" }
```

3. O comando `video` já tem rede de segurança: se o arquivo faltar ou o navegador recusar
   tocar, ele mostra "toque para começar" e, em 12 s, segue o roteiro sozinho. Vídeo
   quebrado não trava a cena.
