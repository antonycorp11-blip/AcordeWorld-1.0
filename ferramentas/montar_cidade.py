#!/usr/bin/env python3
"""
Monta Acordelot: muralha, malha de ruas, quarteirões, praça e arborização.

A cidade nasce da RUA, não das casas. Primeiro o traçado — avenidas e travessas —,
depois os quarteirões que sobram entre elas, e só então as casas, viradas para a rua
que têm na frente. É a ordem em que cidade de verdade cresce, e é o que evita aquele
aspecto de casas espalhadas num gramado.
"""
import json, math, random
from pathlib import Path
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
random.seed(31337)
cat = json.loads((RAIZ/'assets/objects.json').read_text())['props']
cfg = json.loads((RAIZ/'assets/mundo/mundo.json').read_text())
BW, BH = cfg['bloco']['w'], cfg['bloco']['h']

# ── A cidade ocupa o norte do mundo, acima do bosque ────────────────────────────
X0, Y0, LARG, ALT = 260, 150, 3700, 1120

# Fora da área da cidade, e sem props órfãos: o mundo ainda carregava peças de
# caminho que saíram do catálogo quando viraram material de pincel.
props = [p for p in cfg['props'] if p['prop'] in cat
         and not (X0-260 <= p['x'] <= X0+LARG+260 and Y0-150 <= p['y'] <= Y0+ALT+200)]
print(f'objetos fora da área da cidade preservados: {len(props)}')

def add(prop, x, y, esc=1.0, flip=None, rot=0):
    if prop not in cat: return
    props.append({'id': f'{prop}_{len(props):04d}', 'prop': prop, 'x': int(x), 'y': int(y),
                  'ex': round(esc,2), 'ey': round(esc,2), 'rot': rot,
                  'flipX': bool(random.getrandbits(1)) if flip is None else flip})

def largura(prop, esc=1.0):
    d = cat[prop]; im = Image.open(RAIZ/d['sprite'])
    return d['altura']*esc*im.width/im.height

def altura(prop, esc=1.0):
    return cat[prop]['altura']*esc

# ── 1. A malha de ruas ──────────────────────────────────────────────────────────
# Duas avenidas cruzando e três travessas: dá quarteirões de tamanhos diferentes, que
# é o que faz a cidade parecer crescida e não desenhada na régua.
# UMA avenida principal: com duas, as faixas entre elas ficavam com 140px e a casa
# tem 196 — não cabia fileira nenhuma. Com uma, sobram duas faixas de ~440px, e cada
# uma comporta duas fileiras de casas de fundos um para o outro.
AV_H = [Y0 + 560]                                # avenida leste-oeste
AV_V = [X0 + 900, X0 + 1850, X0 + 2800]          # travessas norte-sul
RUA_LARG, TRAV_LARG = 150, 120
PRACA = (X0 + 1850, Y0 + 380, 330)               # centro x, y, raio

ruas = {'h': [(y, RUA_LARG) for y in AV_H], 'v': [(x, TRAV_LARG) for x in AV_V],
        'praca': PRACA, 'area': (X0, Y0, LARG, ALT)}
Path('/tmp/cidade_ruas.json').write_text(json.dumps(ruas), encoding='utf-8')

def na_rua(x, y, folga=0):
    for (ry, w) in ruas['h']:
        if abs(y - ry) < w/2 + folga and X0 - 60 < x < X0 + LARG + 60: return True
    for (rx, w) in ruas['v']:
        if abs(x - rx) < w/2 + folga and Y0 - 60 < y < Y0 + ALT + 60: return True
    cx, cy, r = PRACA
    if math.hypot(x - cx, (y - cy)/.62) < r + folga: return True
    return False

# ── 2. A muralha, agora modular e contínua ──────────────────────────────────────
LH, AH = largura('mur1_01'), altura('mur1_01')
LV, AV = largura('mur1_02'), altura('mur1_02')
PORTAO_L = largura('mur3_02')

def muro_h(y, x_ini, x_fim, portoes=()):
    x = x_ini
    while x < x_fim:
        if any(abs(x + LH/2 - p) < PORTAO_L*0.75 for p in portoes):
            add('mur3_02', x + PORTAO_L/2, y, 1.0, False); x += PORTAO_L
        else:
            add('mur1_01', x + LH/2, y, 1.0, False); x += LH - 2
def muro_v(x, y_ini, y_fim, portoes=()):
    y = y_ini
    while y < y_fim:
        if any(abs(y + AV/2 - p) < AV*0.9 for p in portoes):
            y += AV - 2; continue                  # abertura para a travessa passar
        add('mur1_02', x, y + AV/2, 1.0, False); y += AV - 2

muro_h(Y0, X0, X0 + LARG, portoes=[AV_V[1]])
muro_h(Y0 + ALT, X0, X0 + LARG, portoes=[AV_V[0], AV_V[2]])
muro_v(X0, Y0, Y0 + ALT, portoes=AV_H)
muro_v(X0 + LARG, Y0, Y0 + ALT, portoes=AV_H)
for cx, cy in ((X0, Y0), (X0+LARG, Y0), (X0, Y0+ALT), (X0+LARG, Y0+ALT)):
    add('mur3_03', cx, cy, 1.15, False)            # torre em cada quina

# ── 3. Os quarteirões ───────────────────────────────────────────────────────────
# Cada casa recebe o ângulo que a faz OLHAR PARA A RUA mais próxima. É o detalhe que
# separa bairro de amontoado: fachadas voltadas para o caminho, fundos para o miolo.
CASAS = {'baixo': ['cas1_01', 'cas1_02'], 'cima': ['cas2_01', 'cas2_02']}
def casa_virada_para(y, ry):
    return random.choice(CASAS['baixo'] if y < ry else CASAS['cima'])

ocupados = []
def livre(x, y, r):
    for (ox, oy, orr) in ocupados:
        if (x-ox)**2 + ((y-oy)/.7)**2 < (r+orr)**2: return False
    return True

def rua_mais_proxima(y):
    return min(AV_H, key=lambda ry: abs(y - ry))

casas = 0
for faixa_i, (ya, yb) in enumerate([(Y0+130, AV_H[0]-110), (AV_H[0]+110, Y0+ALT-130)]):
    y = ya + 40
    while y < yb:
        x = X0 + 120
        while x < X0 + LARG - 120:
            if not na_rua(x, y, 70) and livre(x, y, 105):
                prop = casa_virada_para(y, rua_mais_proxima(y))
                add(prop, x, y, random.uniform(.92, 1.06), random.random() < .5)
                ocupados.append((x, y, 105)); casas += 1
                x += random.randint(215, 265)
            else:
                x += 70
        y += random.randint(215, 245)

# ── 4. A praça central ──────────────────────────────────────────────────────────
cx, cy, r = PRACA
add('cidade1_01', cx, cy, 1.5, False)                     # a Fonte dos Instrumentos
for i in range(8):
    a = math.tau * i / 8 + .2
    add('cidade2_04' if i % 2 else 'cidade3_01', cx + math.cos(a)*(r+120),
        cy + math.sin(a)*(r+120)*.62, 1.0, False)
for i in range(6):
    a = math.tau * i / 6
    add(f'vila1_0{(i%4)+1}', cx + math.cos(a)*(r-40), cy + math.sin(a)*(r-40)*.62, 1.0, False)
add('cidade3_02', cx - r - 210, cy + 60, 1.0, False)      # poço
add('cidade3_03', cx + r + 200, cy - 40, 1.0, False)      # carroça

# ── 5. Arborização e iluminação das ruas ────────────────────────────────────────
# Árvore e lampião alinhados na calçada, alternando os dois lados da via. Rua sem
# arborização lê como corredor; com árvore lê como bairro.
ARVORES_RUA = ['f1_07', 'f1_09', 'mata1_01', 'f1_06']
for (ry, w) in ruas['h']:
    for x in range(X0 + 180, X0 + LARG - 120, 240):
        lado = w/2 + 62
        add(random.choice(ARVORES_RUA), x, ry - lado, random.uniform(.72, .9))
        add(random.choice(ARVORES_RUA), x + 120, ry + lado, random.uniform(.72, .9))
    for x in range(X0 + 300, X0 + LARG - 120, 380):
        add('casa2_07', x, ry - w/2 - 30, 1.0, False)
        add('casa2_10', x + 190, ry + w/2 + 34, 1.0, False)
for (rx, w) in ruas['v']:
    for y in range(Y0 + 200, Y0 + ALT - 120, 230):
        add(random.choice(ARVORES_RUA), rx - w/2 - 58, y, random.uniform(.7, .88))
        add(random.choice(ARVORES_RUA), rx + w/2 + 58, y + 110, random.uniform(.7, .88))

# canteiros e miudezas nos cantos dos quarteirões
for _ in range(150):
    x = random.randint(X0+100, X0+LARG-100); y = random.randint(Y0+100, Y0+ALT-100)
    if na_rua(x, y, 40) or not livre(x, y, 55): continue
    add(random.choice(['f2_03','f2_04','f2_05','f4_03','f4_05','f2_07','f2_09']),
        x, y, random.uniform(.65, .95))

cfg['props'] = props
(RAIZ/'assets/mundo/mundo.json').write_text(json.dumps(cfg, indent=2, ensure_ascii=False),
                                            encoding='utf-8')
import collections
print(f'{casas} casas · {len(props)} objetos no mundo')
print(dict(collections.Counter(cat[p['prop']]['categoria'] for p in props)))
