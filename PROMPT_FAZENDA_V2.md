# Prompts da Fazenda v2 — canteiro, cultivos e ícones

A régua deste jogo, medida no código (não é chute):

| Referência | Tamanho na tela |
|---|---|
| Tela do jogo | 1024 × 600 |
| **Herói** | **32 de largura × 45 de altura** |
| **Célula da grade da fazenda** | **32 × 32** |
| Casa de camponês | ~99 (2 heróis) |
| Habitat (ilha do Eco) | vai baixar para ~140 de largura |

Em todo prompt, diga o tamanho **em relação ao herói** — o gerador entende isso melhor
que pixel. Um canteiro é "do tamanho de um passo do personagem".

---

## Bloco de estilo — cole em TODOS

```
Pixel art de RPG 16-bit, vista de cima com leve inclinação (top-down 3/4, estilo Stardew
Valley). Contorno escuro sutil, sombreamento em blocos, 3 a 4 tons por material, sem
gradiente suave, sem desfoque, sem anti-aliasing nas bordas. Paleta quente de reino
medieval de fantasia musical: madeira mel, pedra cinza-azulada, folhagem verde-oliva,
dourado nos detalhes.
FUNDO MAGENTA PURO #FF00FF, chapado, sem sombra projetada no fundo, sem cenário.
Sem texto, sem números, sem moldura, sem personagem humano na imagem.
```

---

## LEVA 1 — O canteiro (o mais urgente)

**O problema de hoje:** a peça de solo é um retângulo achatado 2:1. Numa fileira ela lê
como uma tábua, não como terra arada. Preciso de uma peça cuja **pegada seja quadrada na
perspectiva** — um quadrado levemente espremido na vertical, não uma tira.

Gere as três, uma por vez, **na mesma proporção e no mesmo enquadramento**:

**1.1 — Canteiro arado (seco)**
```
[BLOCO DE ESTILO]
Uma peça de terra arada de horta, vista de cima com leve inclinação. Formato de QUADRADO
levemente espremido na vertical (a largura é o dobro da altura visível, como um quadrado
visto em perspectiva 3/4). Terra marrom-escura úmida com quatro ou cinco sulcos de arado
paralelos bem marcados, alguns torrões e pedrinhas, e a beirada de terra levemente elevada
em relação ao chão, com um fio de sombra embaixo.
A peça preenche o quadro inteiro, de borda a borda. As bordas esquerda/direita e
superior/inferior devem casar entre si, para que várias cópias lado a lado formem uma
horta contínua sem emenda (seamless tile). Sem grama em volta, sem moldura de madeira.
```

**1.2 — Canteiro regado** — mesmo prompt, trocando por: *"terra encharcada de água, tom
bem mais escuro e frio, brilho úmido nos sulcos, poças pequenas refletindo o céu"*.

**1.3 — Canteiro vazio (só revirado)** — *"terra recém-revirada, mais clara e solta, sem
sulcos definidos, ainda sem semear"*.

---

## LEVA 2 — Os cultivos musicais (4 estágios cada)

**O problema de hoje:** as plantas atuais são genéricas e não conversam com o tema. Cada
cultura do jogo já tem uma **nota** e um nome musical — a planta tem que responder a isso.

Regra dos quatro estágios, para os oito: **o mesmo pé de planta envelhecendo**, mesma
espécie, mesma cor, mesmo lugar no quadro. Só muda tamanho e maturidade.

```
[BLOCO DE ESTILO]
Quatro estágios de crescimento da MESMA planta, em fileira, da esquerda para a direita,
todos centralizados e com a base encostando na mesma linha de chão:
1) broto recém-nascido, duas folhinhas, altura de um terço do personagem
2) planta jovem, folhas abertas, metade da altura do personagem
3) planta adulta, cheia, quase da altura do personagem
4) planta madura pronta para colher, com [O FRUTO], levemente curvada pelo peso
Espaçamento igual entre os quatro. Sem numeração, sem texto.
Planta: [DESCRIÇÃO]
```

Trocando `[DESCRIÇÃO]` e `[O FRUTO]`, com o que o jogo já declara:

| Cultura (nota) | `[DESCRIÇÃO]` e `[O FRUTO]` |
|---|---|
| **Trigo-semínima** (Dó, 5 min) | trigo dourado cujas espigas têm o formato de colcheias; fruto: espigas douradas pesadas |
| **Erva-pausa** (Ré, 12 min) | erva de folhas largas e arredondadas como o símbolo de pausa musical, verde-claro; fruto: vagens roliças |
| **Videira-ligadura** (Mi, 25 min) | videira baixa de gavinhas curvas como ligaduras, folhas em coração; fruto: bagas roxas em cacho |
| **Cana-palheta** (Fá, 45 min) | cana fina e alta de talos âmbar translúcidos como palhetas; fruto: talos âmbar brilhantes |
| **Sino-flor** (Sol, 90 min) | flor de sinos pendentes dourados que parecem badalar; fruto: sinos dourados abertos |
| **Arbusto de Breu** (Lá, 3 h) | arbusto escuro de resina, gotas de âmbar escorrendo dos galhos; fruto: gotas de resina âmbar |
| **Cristal-diapasão** (Si, 6 h) | planta-cristal que cresce em hastes de quartzo azul em forma de diapasão; fruto: cristais azuis brilhando |
| **Abeto Harmônico** (Dó, 12 h) | pequeno abeto de agulhas verde-azuladas com veios dourados no tronco; fruto: pinhas douradas |

Se for muito de uma vez, gere **Trigo, Erva-pausa e Videira** primeiro — são os três ciclos
curtos, os que aparecem no teste.

---

## LEVA 3 — Os ícones da barra

Antes do prompt, **minha proposta para a barra**, respondendo à sua pergunta se tudo
aquilo é necessário: **não é.** Hoje são 11 botões sempre na tela. Proponho **três**:

| Fica | Vai para dentro do menu |
|---|---|
| 🔨 **Construir** (abre o menu com abas) | Terreno, Plantas, Estruturas, Habitats, Decoração |
| ✋ **Recolher** | Limpar tudo, Expandir a ilha |
| ✕ **Sair** | Zoom (vira pinça de dois dedos, como todo mapa de celular) |

E a barra **encolhe sozinha** quando você fica alguns segundos sem usá-la, virando uma
aba fininha no canto — um toque a traz de volta. É isso que resolve o "está o tempo todo
ali me irritando".

```
[BLOCO DE ESTILO]
Um conjunto de 8 ícones quadrados de interface de jogo, dispostos em duas fileiras de
quatro, todos no mesmo tamanho e no mesmo estilo, com leitura clara em tamanho pequeno.
Cada ícone é um objeto isolado visto de frente, com contorno escuro e um leve relevo,
SEM moldura e SEM fundo próprio (o fundo é o magenta).
Os oito, nesta ordem:
1) um martelo de carpinteiro cruzado com um esquadro — construir
2) uma mão aberta de luva de couro — recolher
3) um X de madeira robusto — sair
4) um torrão de terra arada com sulcos — terreno
5) um broto de duas folhas saindo da terra — plantas
6) uma casinha de telhado de palha — estruturas
7) uma clave de sol dourada dentro de um arco de pedra — habitats
8) um vaso de flores com uma flor — decoração
```

---

## O que eu faço enquanto você gera

Nada disto depende de arte:

- **A grade volta a aparecer** quando há algo na mão, e some quando não há.
- **O habitat deixa de nascer sozinho.** Escolher a nota passa a armar o fantasma; você
  escolhe onde e confirma. Hoje ele planta no ato, e por isso você não conseguiu decidir
  a posição.
- **Habitat menor** — de ~200 para ~140 de largura.
- **A tela de "guardar" da captura morre.** No lugar, uma linha embaixo da missão dizendo
  o que caiu. Vira o padrão do jogo, como você pediu.
- **A barra some sozinha** e volta ao toque.
- **Menus repaginados** — mesma moldura escura com filete dourado do resto do jogo.

Manda as levas na ordem. Só a **Leva 1** já tira o canteiro do estado atual.
