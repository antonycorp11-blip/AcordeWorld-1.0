# Vídeo de abertura — Akles acorda na floresta

Filme de ~20 s que roda antes de o jogador ter controle, no lugar da tela preta com
legenda. Termina exatamente no enquadramento em que o jogo começa, para o corte do
vídeo para o gameplay não ter costura.

**Anexe como referência:** o sprite do Akles e um print do cenário "floresta inicial".
O prompt não descreve o rosto nem a roupa dele de propósito — quem define isso é a
imagem de referência, senão a IA inventa um personagem que não é o do jogo.

**Regra que vale para todas as tomadas:** nada de texto, legenda, logotipo ou interface
dentro do vídeo. O título entra depois, por cima, no motor.

---

## Prompt principal (colar inteiro)

> Cinematic 2D pixel-art animation, 16:9, SNES-era JRPG illustration style with modern
> lighting. Slow, quiet, melancholic.
>
> A young swordsman lies unconscious on the forest floor among dead leaves, seen from
> directly above. Cold blue pre-dawn light. The forest is unnaturally still — no wind,
> no birds, no falling leaves, nothing moving anywhere in frame. The stillness should
> feel wrong, like a held breath.
>
> The camera descends slowly toward him. His fingers twitch. He opens his eyes and
> struggles up onto one elbow, disoriented, looking around at a place he does not
> recognize. He touches his own temple as if trying to find something that is missing.
>
> Behind him, deeper in the trees, three small motes of warm golden light drift into
> view and hover, watching him. They are gentle, curious, alive — not fireflies, not
> sparks: soft glowing presences. They are the only warm color in an otherwise cold,
> desaturated frame.
>
> He turns his head toward them. Hold on his face for a beat.
>
> Final shot: camera pulls back and settles into a level side-on view of him kneeling
> in the clearing, the three lights behind him, framed like the start of a journey.
>
> Muted palette — cold blues, grey-greens, bone-white mist. The three lights are the
> only saturated element. Volumetric shafts of weak dawn light through the canopy.
> Film grain, subtle vignette.
>
> No text, no letters, no subtitles, no logo, no UI, no watermark. No modern objects.
> No blood. Camera moves slowly and smoothly throughout — no fast cuts, no shake.

**Negativos:** `text, letters, subtitles, watermark, logo, UI, HUD, modern clothing,
guns, blood, gore, fast camera movement, shaky cam, lens flare, anime face closeup,
photorealistic, 3D render, extra limbs, distorted hands`

---

## Áudio

Peça **sem trilha** e sem efeitos, ou gere mudo. A trilha do jogo já entra por cima,
e o silêncio é o assunto da cena: som genérico de floresta destrói o ponto inteiro.

Se a ferramenta insistir em gerar áudio, peça: *"near-total silence, only a very faint
low drone; no birds, no wind, no insects, no music"*. A ausência de pássaros é
literalmente o que o Akles comenta nas primeiras falas.

---

## Se precisar dividir em tomadas

Ferramentas com limite de 5–8 s por geração — gere separado e monte:

1. **Plongée, 6 s.** Corpo caído entre as folhas, luz azul fria, tudo imóvel. A câmera
   desce devagar.
2. **Média, 6 s.** Ele acorda, se apoia num cotovelo, olha em volta sem reconhecer
   nada, leva a mão à têmpora.
3. **Contracampo, 5 s.** Três luzes douradas pequenas surgem entre as árvores e param,
   observando. Fundo desfocado.
4. **Lateral, 5 s.** Ele ajoelhado, as três luzes atrás, a câmera recuando até parar.

Mantenha a mesma paleta e a mesma direção de luz nas quatro, senão a montagem pula.

---

## Por que a cena é assim

Três coisas precisam ficar plantadas antes de o jogador tocar em qualquer botão, e
nenhuma delas pode ser dita em voz alta:

- **A floresta está errada.** Não é "calma", é *arrancada*. É o rastro do Silêncio, e é
  a primeira vez que o jogador vê o efeito do vilão sem saber que é isso.
- **Ele perdeu alguma coisa e sabe disso.** A mão na têmpora carrega a amnésia inteira
  sem uma linha de diálogo.
- **Os Ecos chegam antes de serem explicados.** Eles reaparecem no resgate, no fim da
  mesma cena — e aí o jogador reconhece. São três, e são Dó, Mi e Sol: o primeiro
  acorde do jogo, escondido à vista.

---

## Como ligar no jogo

Salve como `assets/videos/abertura_floresta.mp4` e rode `./build.sh`. Depois, o
primeiro passo de `assets/cutscenes/abertura.json`:

```json
{ "cmd": "video", "arquivo": "abertura_floresta.mp4" }
```

O comando pula com um toque, e se o arquivo faltar a cena segue sem travar.

**Nota sobre o nome:** este é o mapa "floresta inicial", não a Floresta Sombria — a
Sombria é onde moram os Dissonantes e aparece depois, no fim do capítulo. Quando for
gerar o vídeo dela, o clima é outro: lá não é vazio, é *habitado*.
