#!/usr/bin/env python3
"""
Monta o mundo a partir do catálogo de props, com distribuição orgânica.

O que separa "montado" de "sorteado": sorteio uniforme produz pontilhado regular, que o
olho lê como grade. Natureza é agrupada — árvore nasce perto de árvore, moita nasce na
sombra da árvore, flor nasce onde o mato rareia. As regras abaixo existem por isso.
"""
import json, math, random

random.seed(778899)
CAT = json.load(open('assets/objects.json'))['props']

BW, BH, COLS, ROWS = 1024, 571, 9, 4
W, H = BW * COLS, BH * ROWS          # 6144 x 2284
ESTRADA_Y = 1180                      # a estrada atravessa o mundo nesta linha
CORREDOR = 150                        # nada é plantado dentro desta folga

props = []
ocupados = []                         # (x, y, raio) do que já foi plantado

def add(prop, x, y, esc=1.0, flip=None, espaco=0):
    if prop not in CAT: return False
    x, y = int(x), int(y)
    if not (30 < x < W - 30 and 30 < y < H - 30): return False
    if espaco:
        for ox, oy, orr in ocupados:
            if (x-ox)**2 + (y-oy)**2 < (espaco+orr)**2: return False
    props.append({'id': f'{prop}_{len(props):04d}', 'prop': prop, 'x': x, 'y': y,
                  'escala': round(esc, 2),
                  'flipX': bool(random.getrandbits(1)) if flip is None else flip})
    if espaco: ocupados.append((x, y, espaco))
    return True

def fora_da_estrada(y, folga=CORREDOR):
    return abs(y - ESTRADA_Y) > folga

# ── Aglomerado: um núcleo e seus satélites ──────────────────────────────────────
# É a regra que mais muda o resultado. Em vez de N sorteios independentes, poucos
# núcleos com vizinhos em volta — bosque em vez de pontilhado.
def aglomerado(tipos, cx, cy, n, raio, escala=(.8, 1.15), espaco=40):
    for _ in range(n):
        a = random.random() * math.tau
        d = raio * math.sqrt(random.random())          # sqrt: distribuição uniforme no disco
        add(random.choice(tipos), cx + math.cos(a) * d, cy + math.sin(a) * d * .7,
            random.uniform(*escala), espaco=espaco)

# ── Família: a árvore e o séquito dela ──────────────────────────────────────────
# Uma árvore sozinha no gramado lê como "objeto colocado". Com moita cobrindo a base e
# flor na frente, lê como "isto cresceu aqui".
MATO = ['f2_01','f2_02','f2_07','f2_08','mata3_02','f2_04']
FLOR = ['f4_01','f4_02','f4_03','f4_04','f4_05','f4_06','mata3_05','mata3_06','mata3_07']
CAPIM = ['f2_09','f2_10','f2_11']

def familia(arvore, x, y, esc=1.0):
    if not add(arvore, x, y, esc, espaco=52): return
    for _ in range(random.randint(1, 3)):
        add(random.choice(MATO), x + random.randint(-80, 80), y + random.randint(-6, 26),
            random.uniform(.75, 1.1))
    for _ in range(random.randint(1, 4)):
        add(random.choice(FLOR + CAPIM), x + random.randint(-110, 110),
            y + random.randint(4, 46), random.uniform(.7, 1.15))

# ════════════════════════════════════════════════════════════════════════════════
# 1. A ESTRADA
# Calçada de pedra na vila, terra batida no resto. Y constante: peça reta tem borda
# própria, e qualquer degrau entre vizinhas deixa a borda de uma sobre a terra da outra.
# ════════════════════════════════════════════════════════════════════════════════
# Nada de peças de caminho: a estrada e o calçamento da praça são TERRENO, pintados
# direto no chão pelo gerador de blocos. Peça de caminho traz a própria borda de grama
# e emenda com a vizinha — era daí que vinham os retângulos ao longo do caminho.

# beira da estrada: pedrinha e tufo quebrando a linha reta
for _ in range(60):
    bx = random.randint(80, W - 80)
    by = ESTRADA_Y + random.choice([-1, 1]) * random.randint(96, 132)
    add(random.choice(['f4_11','f4_10','f2_11','f2_10','f4_02']), bx, by,
        random.uniform(.6, 1.0))

# ════════════════════════════════════════════════════════════════════════════════
# 2. ACORDELOT — a cidade (x 0–3300)
# Praça redonda com a Fonte dos Instrumentos no centro, a muralha fechando o oeste,
# a feira de um lado e as casas do outro. O calçamento é terreno pintado, não peça.
# ════════════════════════════════════════════════════════════════════════════════
PX, PY = 1500, ESTRADA_Y          # centro da praça

# A muralha fecha o mundo a oeste, com o portão sobre a estrada.
# O trecho de muralha mede 178x150 em jogo: emendo de 168 em 168 (10px de
# sobreposição) para virar uma linha contínua. Espaçar por raio, como fiz na
# primeira tentativa, rejeitava as vizinhas e deixava blocos soltos no gramado.
# O trecho de muralha é desenhado de LADO — empilhá-lo na vertical faz escadinha, não
# muralha. Então ela corre no sentido em que foi desenhada: fechando a cidade ao norte
# e ao sul, com o portão e as torres guardando a entrada da estrada, a oeste.
PORTAO_ESC = 1.5
add('cidade1_02', 330, ESTRADA_Y, PORTAO_ESC, False)
meia_porta = 242 * PORTAO_ESC / 2
add('cidade1_04', 330, ESTRADA_Y - meia_porta - 70, 1.25, False)
add('cidade1_04', 330, ESTRADA_Y + meia_porta + 70, 1.25, False)
for bx in range(360, 3260, 168):          # 178 de largura, 10 de sobreposição
    add('cidade1_03', bx, 300, 1.0, False)
    add('cidade1_03', bx, H - 250, 1.0, False)
add('cidade1_04', 3300, 300, 1.15, False)
add('cidade1_04', 3300, H - 250, 1.15, False)

# A fonte, coração da cidade: é o marco, e marco tem que ter porte
add('cidade1_01', PX, PY, 1.6, False, espaco=130)

# Casas ao norte da praça, alinhadas mas não em fila: cada uma recuada por conta
for i, (bx, prop) in enumerate([(760, 'cidade2_02'), (1080, 'cidade2_01'),
                                (1500, 'cidade2_01'), (1900, 'cidade2_02'),
                                (2280, 'cidade2_03')]):
    add(prop, bx, PY - 470 + (i % 2) * 55, 1.0, False, espaco=110)
# e ao sul
for i, (bx, prop) in enumerate([(900, 'cidade2_02'), (1320, 'cidade2_03'),
                                (1780, 'cidade2_01'), (2200, 'cidade2_02')]):
    add(prop, bx, PY + 480 - (i % 2) * 50, 1.0, False, espaco=110)

# A feira em arco na beira da praça
for i in range(6):
    a = math.pi * (0.18 + 0.64 * i / 5)
    fx, fy = PX + math.cos(a) * 560, PY + math.sin(a) * 330
    add('cidade2_04' if i % 2 else 'cidade3_01', fx, fy, 1.0, False, espaco=70)

add('cidade3_02', PX - 430, PY - 250, 1.0, False, espaco=60)   # poço
add('cidade3_03', PX + 470, PY + 250, 1.0, False, espaco=60)   # carroça
for bx, by in [(PX - 620, PY + 210), (PX + 300, PY - 300), (PX + 640, PY - 190)]:
    add('cidade3_04', bx, by, 1.0, False, espaco=50)

# o mobiliário urbano que já existia
for i, bx in enumerate((1050, 1250, 1750, 1950)):
    add(f'vila1_0{(i % 4) + 1}', bx, PY - 250, 1.0, False, espaco=45)
for bx in (700, 1150, 1850, 2300):
    add('casa2_07', bx, PY - 195, 1.0, False, espaco=35)
    add('casa2_10', bx + 150, PY + 200, 1.0, False, espaco=35)
add('casa2_02', 1300, PY - 300, 1.0, False)
add('casa2_05', 1700, PY - 300, 1.0, False)
add('vila3_03', 480, PY - 130, 1.0, False)
add('vila3_04', 480, PY + 130, 1.0, False)
add('vila2_01', 2950, PY - 150, 1.0, False, espaco=50)   # leões na saída leste
add('vila2_02', 2950, PY + 155, 1.0, False, espaco=50)
# jardineiras e verde dentro da cidade
for _ in range(26):
    jx, jy = random.randint(420, 3100), random.randint(300, H - 300)
    if math.hypot((jx - PX) / 1.0, (jy - PY) / .58) < 700: continue
    if abs(jy - ESTRADA_Y) < 190: continue
    add(random.choice(['f2_03','f2_04','f2_05','f4_05','f4_03','f2_07']), jx, jy,
        random.uniform(.7, 1.0), espaco=40)
for _ in range(9):
    jx, jy = random.randint(500, 3050), random.choice([random.randint(430, 660),
                                                       random.randint(H - 660, H - 430)])
    add(random.choice(['mata1_01','f1_07','f1_09']), jx, jy, random.uniform(.75, .95), espaco=90)

# ════════════════════════════════════════════════════════════════════════════════
# 2b. A VILA ANTIGA — desativada: virou a cidade acima
# ════════════════════════════════════════════════════════════════════════════════
if False:
    add('casa2_09', 700, 780, 1.0)                       # calçada subindo para as casas
    add('casa1_01', 620, 700, 1.0, False, espaco=90)
    add('casa1_02', 1080, 730, 1.0, False, espaco=80)
    add('casa2_06', 1150, 900, 1.0)
    for bx in (430, 900, 1330):
        add('casa2_04' if bx % 2 else 'casa2_07', bx, ESTRADA_Y - 130, 1.0, False)
        add('casa2_10', bx + 120, ESTRADA_Y + 128, 1.0, False)
    add('casa2_02', 780, ESTRADA_Y - 210, 1.0, False)
    add('casa2_05', 1180, 660, 1.0, False)
    add('vila3_03', 300, ESTRADA_Y - 120, 1.0, False)
    add('vila3_04', 300, ESTRADA_Y + 120, 1.0, False)
    for i, bx in enumerate((520, 640, 990)):
        add(f'vila1_0{(i % 4) + 1}', bx, ESTRADA_Y - 165, 1.0)
    # leões guardando a saída da vila
    add('vila2_01', 1620, ESTRADA_Y - 140, 1.0, False)
    add('vila2_02', 1620, ESTRADA_Y + 145, 1.0, False)
    # cercas fechando os fundos
    for bx in range(200, 1500, 150):
        if random.random() < .7:
            add(random.choice(['vila2_03','vila3_01']), bx, 500, 1.0, False)
    aglomerado(['f2_03','f2_04','f2_05'], 830, 860, 6, 130, (.7, 1.0), 34)

# ════════════════════════════════════════════════════════════════════════════════
# 3. A MATA QUE FECHA O MUNDO
# Duas camadas: conífera atrás, frondosa na frente. A ordenação pelo pé faz o resto.
# ════════════════════════════════════════════════════════════════════════════════
CONIF = ['f1_02','f1_03','f1_04','f1_05']
FROND = ['f1_01','f1_06','f1_07','f1_08','f1_09','mata1_01','mata1_02','mata1_03']

for bx in range(50, W, 96):
    add(random.choice(CONIF), bx + random.randint(-26, 26), random.randint(60, 130),
        random.uniform(.85, 1.15), espaco=30)
for bx in range(90, W, 150):
    familia(random.choice(FROND), bx + random.randint(-40, 40), random.randint(190, 300),
            random.uniform(.8, 1.1))
for bx in range(60, W, 104):
    add(random.choice(CONIF), bx + random.randint(-26, 26), random.randint(H-130, H-50),
        random.uniform(.9, 1.2), espaco=30)
for bx in range(120, W, 160):
    familia(random.choice(FROND), bx + random.randint(-40, 40), random.randint(H-350, H-230),
            random.uniform(.85, 1.15))

# ════════════════════════════════════════════════════════════════════════════════
# 4. O BOSQUE (x 1700–4100) — bosques com clareira entre eles
# ════════════════════════════════════════════════════════════════════════════════
for _ in range(16):
    cx = random.randint(3500, 6800)
    cy = random.choice([random.randint(430, 950), random.randint(1420, H-420)])
    if not fora_da_estrada(cy, 230): continue
    familia(random.choice(FROND + CONIF), cx, cy, random.uniform(.8, 1.1))
    aglomerado(FROND + CONIF, cx, cy, random.randint(2, 4), 190, (.7, 1.0), 62)
    aglomerado(MATO, cx, cy + 30, random.randint(3, 6), 150, (.75, 1.1), 30)

# lago com vitórias-régias, com moita em volta
add('sagrado1_04', 4700, 1620, 1.15)
add('sagrado1_05', 4900, 1700, .9)
aglomerado(MATO + ['f2_09'], 4700, 1620, 8, 230, (.7, 1.05), 34)
add('mata2_01', 4510, 1560, 1.0, espaco=40)
add('mata2_03', 4940, 1560, .9, espaco=40)

# afloramento de rocha
for cx, cy in [(5600, 700), (5720, 760), (5520, 790)]:
    add(random.choice(['mata2_01','mata2_02','mata2_03','f4_12']), cx, cy,
        random.uniform(.9, 1.3), espaco=44)

# o meio do mundo estava vazio: mais bosques entre a vila e o bosque sagrado
for _ in range(10):
    cx = random.randint(3500, 6700)
    cy = random.choice([random.randint(500, 900), random.randint(1500, H - 500)])
    if not fora_da_estrada(cy, 250): continue
    aglomerado(FROND + CONIF, cx, cy, random.randint(3, 6), 230, (.75, 1.05), 66)
    aglomerado(MATO, cx, cy + 40, random.randint(4, 8), 190, (.75, 1.1), 30)

# campos de flor onde o mato rareia
for _ in range(9):
    cx, cy = random.randint(3500, 6800), random.randint(400, H - 400)
    if not fora_da_estrada(cy, 190): continue
    aglomerado(FLOR + CAPIM, cx, cy, random.randint(8, 16), 160, (.7, 1.2), 22)

# ════════════════════════════════════════════════════════════════════════════════
# 5. O BOSQUE SAGRADO (x 4300–6100)
# A Árvore-Mãe no centro de uma clareira, as estelas em semicírculo, e o brilho dos
# cogumelos marcando o lugar como diferente de tudo o mais.
# ════════════════════════════════════════════════════════════════════════════════
CX, CY = 7900, 1650
add('sagrado2_01', CX + 480, CY + 120, 1.1)          # lago
add('magico2_02', CX - 430, CY + 60, 1.0)            # fonte dourada
add('sagrado1_01', CX, CY, 1.0, False, espaco=120)   # a Árvore-Mãe

for i in range(7):                                   # estelas em semicírculo
    a = math.pi * (0.15 + 0.7 * i / 6)
    ex, ey = CX + math.cos(a) * 520, CY + math.sin(a) * 300
    add(['sagrado3_02','sagrado3_03','lapide1_02','lapide1_03','lapide1_01',
         'lapide1_04','sagrado2_04'][i], ex, ey, 1.0, False, espaco=50)
add('sagrado3_04', CX - 300, CY - 260, 1.0, False, espaco=60)
add('sagrado3_05', CX + 300, CY - 260, 1.0, False, espaco=60)

add('sagrado1_02', CX - 700, CY - 120, .95, espaco=70)
add('sagrado1_03', CX + 720, CY - 150, .95, espaco=70)

for _ in range(14):                                  # cogumelos, só aqui
    a = random.random() * math.tau
    d = random.uniform(180, 620)
    add(random.choice(['lapide3_01','lapide3_02','lapide3_03']),
        CX + math.cos(a) * d, CY + math.sin(a) * d * .6, random.uniform(.7, 1.2), espaco=26)

# Muro antigo cercando o bosque. CY-470 caía exatamente sobre a estrada — o muro
# atravessava o caminho. Fica abaixo do corredor, separando estrada e bosque sagrado.
for bx in range(7250, 8650, 190):
    add('sagrado2_02', bx, CY - 280, 1.0, False, espaco=40)
add('sagrado2_03', 8730, CY - 270, 1.0, False)

# pedras da partitura, o motivo do lugar existir
add('lapide2_01', 7350, CY + 330, 1.05, espaco=60)
add('lapide2_03', 8450, CY + 300, 1.0, espaco=60)
add('lapide2_02', 7900, CY + 430, 1.0, espaco=55)

# cachoeiras na quina do mundo
add('magico3_02', 8700, 620, 1.1, False, espaco=70)
add('magico3_01', 8450, 520, .95, False, espaco=60)
add('magico2_01', 8600, 800, 1.0)

# a ponte, onde a estrada encontra o bosque sagrado
add('vila2_04', 6100, ESTRADA_Y, 1.0, False)

# ════════════════════════════════════════════════════════════════════════════════
cfg = json.load(open('assets/mundo/mundo.json'))
cfg['nome'] = 'Acordelot e o Vale das Claves'
cfg['cols'], cfg['rows'] = COLS, ROWS
cfg['spawn'] = {'x': 430, 'y': ESTRADA_Y + 60}
cfg['props'] = props
json.dump(cfg, open('assets/mundo/mundo.json', 'w'), indent=2, ensure_ascii=False)

import collections
print(f'{len(props)} objetos · mundo {W}x{H}')
print(dict(collections.Counter(CAT[p["prop"]]["categoria"] for p in props)))
