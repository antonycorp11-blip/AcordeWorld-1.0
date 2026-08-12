# Prompts dos sprites da Fazenda — para gerar no Flow

Fazenda em **ilha modular**, no esquema Dragon City: base de ilha que cresce, tudo
encaixando em grade. Nada de fruta comum — **o que se planta aqui tem a ver com música**,
e serve para alimentar os Ecos Musicais, que são os pets.

## Regra técnica — cole isto em TODO prompt

> Pixel art game sprite sheet on a solid pure magenta background (#FF00FF), nothing else
> in the background. Top-down 3/4 game view, light always from the upper left, soft
> contact shadow under each object. Items arranged in a clean uniform grid with generous
> even spacing, each item fully inside its own cell, never touching or overlapping.
> Consistent scale and one cohesive palette across the whole sheet. Crisp pixel edges, no
> blur, no glow spill onto the background. No text, no labels, no numbers, no watermark,
> no frame.

O fundo magenta não é capricho: o recorte do projeto usa `mag = min(R,B) − G` com limite
55–60 e erosão de 1px. Fundo branco ou transparente com franja quebra o recorte.

---

## 1. Base da ilha (o chão que cresce)

> …**Content: a modular floating-island tileset for a farm.** 4×4 grid. Row 1: four grass
> ground tiles, seamless and tileable, slightly different so a field doesn't look repeated.
> Row 2: island EDGE pieces — top edge, bottom edge, left edge, right edge, each showing
> grass on top and a cliff of brown earth and pale rock falling away underneath.
> Row 3: the four OUTER CORNER pieces of the island cliff. Row 4: the four INNER corner
> pieces, plus a small stone dock/ramp and a wooden bridge segment for connecting islands.
> Lush green grass, warm earth, cozy storybook feel.

## 2. Canteiro de plantação (modular, encaixável)

Este é o mais importante: é ele que precisa emendar sem costura visível.

> …**Content: a modular tilled-soil tileset for planting.** 3×3 grid forming a complete
> nine-slice: top-left corner, top edge, top-right corner / left edge, center fill, right
> edge / bottom-left corner, bottom edge, bottom-right corner. Dark rich furrowed earth
> with visible parallel furrows running in the same direction on every piece, so tiles
> line up seamlessly. Neat wooden border trim on the outer edges only. Add, in a fourth
> row, three variants of the center fill: dry soil, freshly watered dark soil, and soil
> with tiny green sprouts breaking through.

## 3. As plantações musicais — 4 estágios de crescimento cada

Nada de maçã e cenoura. São materiais de luthier e alimento de Eco.

> …**Content: musical crop plants for a fantasy farm, 4 growth stages each, arranged in
> rows.** Each row is one crop, showing left to right: sprout, young, mature, ready to
> harvest (visibly fuller and glowing very faintly).
>
> Row 1 — **Reed Cane**: tall slender river cane, pale gold, the tips splitting into thin
> flat reeds like clarinet reeds.
> Row 2 — **Quarter-Note Wheat**: wheat stalks whose grains are small solid black
> note-heads with tiny stems.
> Row 3 — **Slur Vine**: a low creeping vine that grows in smooth curved arcs, like the
> curve of a musical slur, with small round berries along the curve.
> Row 4 — **Rest Herb**: a squat dark-green herb whose leaves curl into the shape of a
> musical rest.
> Row 5 — **Bellflower**: a stalk of small metallic bronze bell-shaped flowers, hanging
> downward, with a tiny clapper visible inside the open ones.
> Row 6 — **Tuning Crystal**: a cluster of pale blue crystal prongs growing out of the
> soil in pairs, like tuning forks emerging from the ground.
> Row 7 — **Rosin Sap Bush**: a small dark bush with amber resin beads swelling on the
> branches.
> Row 8 — **Harmonic Spruce sapling**: a small conifer with unusually straight, even
> grain visible in the trunk, pale honey-colored wood at the cut.

*(Cana-palheta, breu e abeto/bordo são materiais reais de instrumento — palheta, arco e
tampo harmônico. Isso dá lastro à fazenda: ela alimenta os Ecos e abastece a luteria.)*

## 4. Sementes e itens colhidos (ícones de inventário)

> …**Content: 5×4 grid of small farm inventory icons.** Seed pouches — one per crop, small
> cloth bags with a tiny symbol of the plant on the front, each bag a different color.
> Harvested goods: a bundle of cut reeds tied with twine, a sheaf of note-head wheat, a
> coil of slur vine, a jar of amber rosin, a bronze bell blossom, a raw tuning crystal, a
> plank of pale honey tonewood. Plus: a watering can, a scythe, a hoe, a wooden bucket, a
> feed sack. Chunky readable icon shapes, strong silhouettes.

## 5. Habitats dos Ecos (os pets)

Como os habitats do Dragon City: cada um combina com a natureza de um Eco.

> …**Content: 7 small fantasy pet habitats for musical spirits, one per cell, plus 1 empty
> pen.** Each is a small built structure on a patch of ground, cozy and handcrafted:
> a stone alcove with a curved back like a sound shell; a wooden gazebo with hanging
> chimes; a shallow round reflecting pool ringed with pebbles; a hollow log with a soft
> nest inside; a low bronze bowl on a tripod with a cushion; a spiral of standing stones
> with a nest in the middle; a small tiered wooden roost like an open birdhouse. Each
> habitat glows very faintly in a different single color. Last cell: a plain empty fenced
> pen with a gate, unbuilt.

## 6. Casas, cercas e estruturas

> …**Content: farm buildings and modular fencing.** Top two rows: 6 farmhouses in
> different styles and sizes — a small starter cottage with thatched roof; a stone cottage
> with a blue tile roof; a tall narrow house with a music-staff pattern carved in the
> gable; a wide barn with big double doors; a round tower house with a conical roof; a
> greenhouse with glass panels in a wooden frame.
> Third row: a chicken-coop-style small animal shed, a windmill, a well, a storage silo,
> a market stall with striped awning, a workbench with tools.
> Fourth row — **modular wooden fence, all pieces separate**: straight horizontal segment,
> straight vertical segment, four corner pieces, a T junction, a gate open, a gate closed,
> and a single post. All fence pieces must line up exactly end to end.

## 7. Decoração e caminhos

> …**Content: farm decoration and modular paths.** A nine-slice dirt path tileset and a
> nine-slice stone path tileset, both seamless. Plus: hay bales, wooden crates, barrels,
> a scarecrow holding a conductor's baton, flower boxes, a lamppost, small signposts, a
> water trough, stacked firewood, a bench, and three sizes of decorative rock.

---

## O que ainda falta decidir (não é sprite, é regra)

Antes de a fazenda virar sistema de verdade, três coisas precisam de resposta sua:

**Quanto tempo cresce cada plantação?** Sem tempo passando não há motivo para voltar
amanhã — e é o que separa fazendinha de editor de decoração.

**O que cada Eco come, e o que ele dá em troca?** O encaixe bonito seria por afinidade de
nota: o Eco do Dó come o que cresce em Dó. E o que ele produz seria fragmento da nota
dele — ligando a fazenda ao sistema de escalas em vez de ser um minigame solto.

**A ilha cresce como?** Comprando expansão com ouro, ou desbloqueando pela história?

---

## Depois de gerar

1. Salve as folhas em `assets/props/` (ou me mande que eu recorto).
2. O recorte por magenta já existe no projeto — `mag = min(R,B) − G`, limite 55–60, erosão
   de 1px para matar a franja roxa.
3. Os props da fazenda hoje usam **arte provisória**: em `assets/dados/objects.json` cada
   um tem `sprite_desejado` guardado com o caminho pretendido e `provisorio: true`. É só
   trocar `sprite` pelo arquivo novo e apagar essas duas chaves.
4. `python3 ferramentas/verificar_jogo.py` acusa qualquer sprite que não exista em disco.
