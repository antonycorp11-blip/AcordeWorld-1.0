#!/usr/bin/env python3
"""
Planta baixa de Acordelot com os tiles de piso importados no editor.

Nada é pintado aqui: cada pedaço de rua é um TILE do catálogo, escolhido pelos vizinhos
(auto-tile) e girado para o meio-fio cair no lado certo. O jogo já sabe girar props em
torno do centro, então das seis peças com meio-fio saem as dezesseis situações.

O traçado foge da régua de propósito: a avenida principal serpenteia em degraus, as
transversais nascem em pontos irregulares, e há duas praças — uma redonda e uma
quadrada — que quebram a malha.
"""
import json, math, random
from pathlib import Path
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
random.seed(20260731)

CEL = 160                       # lado da célula, em pixels de mundo
X0, Y0 = 320, 240               # canto da malha
COLS, LINS = 26, 9              # tamanho da malha da cidade

cat = json.loads((RAIZ/'assets/objects.json').read_text())['props']
cfg = json.loads((RAIZ/'assets/mundo/mundo.json').read_text())

CHEIOS = [f'game_tileset_on_wh_{n}' for n in ('01','02','03','04','05','06','10','12','14')]
BORDA  = 'game_tileset_on_wh_07'   # meio-fio embaixo (lado S)
FAIXA  = 'game_tileset_on_wh_08'   # meio-fio nos dois lados (O e L)
ESQ    = 'game_tileset_on_wh_09'   # esquina: meio-fio em cima e à esquerda (N e O)
COTOV  = 'game_tileset_on_wh_13'   # cotovelo

# ── 1. O traçado ────────────────────────────────────────────────────────────────
rua = set()
def celula(c, l):
    if 0 <= c < COLS and 0 <= l < LINS: rua.add((c, l))
def faixa_h(l, c0, c1, esp=1):
    for c in range(c0, c1+1):
        for k in range(esp): celula(c, l+k)
def faixa_v(c, l0, l1, esp=1):
    for l in range(l0, l1+1):
        for k in range(esp): celula(c+k, l)

# Avenida principal: leste-oeste, em degraus. Uma célula de largura — com duas, a
# pedra tomava a cidade e os quarteirões sumiam.
faixa_h(4, 0, 6); faixa_v(6, 4, 6)
faixa_h(6, 6, 12); faixa_v(12, 3, 6)
faixa_h(3, 12, 18); faixa_v(18, 3, 7)
faixa_h(7, 18, COLS-1)

# transversais em posições irregulares, deixando quarteirões de 3 a 5 células
faixa_v(3, 0, 4); faixa_v(9, 0, 6); faixa_v(15, 1, 8); faixa_v(22, 3, 8)
faixa_h(8, 9, 15)                      # travessa de fundo
faixa_v(20, 0, 3)                      # beco que sobe para a muralha
faixa_h(1, 20, 24)                     # ruela do norte

# praça REDONDA no encontro da avenida com a transversal do meio
PR_C, PR_L, PR_R = 9, 4, 2.6
for c in range(COLS):
    for l in range(LINS):
        if math.hypot(c - PR_C, (l - PR_L) * 1.3) <= PR_R: celula(c, l)
# praça QUADRADA a leste, encostada na avenida
for c in range(19, 22):
    for l in range(5, 8): celula(c, l)

# ── 2. Auto-tile: o vizinho decide a peça e o giro ──────────────────────────────
# N, L, S, O ligados? A peça e o ângulo saem daí. Girar em torno do centro é o que
# permite tirar as dezesseis situações de apenas quatro desenhos.
def tem(c, l): return (c, l) in rua

def escolher(c, l):
    n, e, s, o = tem(c,l-1), tem(c+1,l), tem(c,l+1), tem(c-1,l)
    viz = (n, e, s, o)
    if all(viz): return random.choice(CHEIOS), 0
    if viz == (True, True, True, False):  return BORDA, math.pi/2     # falta O
    if viz == (True, False, True, True):  return BORDA, -math.pi/2    # falta L
    if viz == (False, True, True, True):  return BORDA, math.pi       # falta N
    if viz == (True, True, False, True):  return BORDA, 0             # falta S
    if viz == (True, False, True, False): return FAIXA, 0             # corredor N-S
    if viz == (False, True, False, True): return FAIXA, math.pi/2     # corredor L-O
    if viz == (False, True, True, False): return ESQ, 0               # canto N+O
    if viz == (False, False, True, True): return ESQ, math.pi/2       # canto N+L
    if viz == (True, False, False, True): return ESQ, math.pi         # canto S+L
    if viz == (True, True, False, False): return ESQ, -math.pi/2      # canto S+O
    # pontas e casos raros: o cotovelo aceita bem
    return COTOV, random.choice([0, math.pi/2, math.pi, -math.pi/2])

# ── 3. Escreve no mundo ─────────────────────────────────────────────────────────
AREA = (X0 - CEL, Y0 - CEL, COLS*CEL + 2*CEL, LINS*CEL + 2*CEL)
ax, ay, aw, ah = AREA
props = [p for p in cfg['props'] if p['prop'] in cat
         and not (ax <= p['x'] <= ax+aw and ay <= p['y'] <= ay+ah)]
print(f'objetos preservados fora da cidade: {len(props)}')

tam = {}
def escala(prop):
    if prop not in tam:
        im = Image.open(RAIZ/cat[prop]['sprite'])
        tam[prop] = (CEL/im.width, CEL/im.height)
    return tam[prop]

def add(prop, x, y, ex=1, ey=1, rot=0, flip=None):
    if prop not in cat: return
    props.append({'id': f'{prop}_{len(props):04d}', 'prop': prop, 'x': int(x), 'y': int(y),
                  'ex': round(ex,3), 'ey': round(ey,3), 'rot': round(rot,4),
                  'flipX': bool(random.getrandbits(1)) if flip is None else flip})

for (c, l) in sorted(rua):
    prop, rot = escolher(c, l)
    ex, ey = escala(prop)
    add(prop, X0 + c*CEL + CEL/2, Y0 + l*CEL + CEL/2, ex, ey, rot, False)

Path('/tmp/planta_rua.json').write_text(json.dumps({
    'cel': CEL, 'x0': X0, 'y0': Y0, 'cols': COLS, 'lins': LINS,
    'rua': sorted(list(rua)), 'praca': [PR_C, PR_L, PR_R]}), encoding='utf-8')

cfg['props'] = props
(RAIZ/'assets/mundo/mundo.json').write_text(json.dumps(cfg, indent=2, ensure_ascii=False),
                                            encoding='utf-8')
print(f'{len(rua)} células de rua · {len(props)} objetos no mundo')
