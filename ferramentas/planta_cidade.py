#!/usr/bin/env python3
"""
Planta baixa de Acordelot com os tiles de piso.

A malha CRESCE, não é desenhada. Cidade real não nasce de linhas retas traçadas na
prancheta: nasce de caminhos que ligam portões a praças, de ruas que se abrem a partir
desses caminhos e de vielas que aparecem onde o quarteirão ficou fundo demais. O
algoritmo segue essa ordem, e é por isso que o resultado não fica quadriculado.

Cada célula de rua vira um TILE do catálogo, escolhido pelos vizinhos (auto-tile) e
girado para o meio-fio cair no lado certo — das poucas peças com meio-fio saem as
dezesseis situações.
"""
import json, math, random
from pathlib import Path
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
random.seed(20260803)

CEL = 160
X0, Y0 = 320, 260
COLS, LINS = 30, 11

cat = json.loads((RAIZ/'assets/objects.json').read_text())['props']
cfg = json.loads((RAIZ/'assets/mundo/mundo.json').read_text())

CHEIOS = [f'game_tileset_on_wh_{n}' for n in ('01','02','03','04','05','06','10','12','14')]
BORDA = 'game_tileset_on_wh_07'   # meio-fio no lado S
FAIXA = 'game_tileset_on_wh_08'   # meio-fio em O e L
ESQ   = 'game_tileset_on_wh_09'   # meio-fio em N e O
COTOV = 'game_tileset_on_wh_13'

rua = set()          # células de piso
terra = set()        # trilhas de terra, fora dos muros
reservado = set()    # terrenos grandes: castelo, feira, templo
quarteiroes = []     # retângulos que sobraram entre as ruas

def ok(c, l): return 0 <= c < COLS and 0 <= l < LINS
def livre(c, l): return ok(c, l) and (c, l) not in reservado

# ── 1. Subdivisão: a cidade é um retângulo que vai sendo cortado por ruas ────────
# É assim que planta urbana se faz. Cada corte vira uma rua de UMA célula, e o que
# sobra dos dois lados é quarteirão — que por sua vez é cortado de novo até ficar do
# tamanho de um quarteirão de verdade. Duas garantias que a versão anterior não tinha:
# nenhuma rua encosta na outra sem ser em cruzamento, e a densidade é controlada por um
# número só (o tamanho mínimo do quarteirão).
MIN_QUARTEIRAO = 3        # em células; abaixo disso não vale a pena cortar
DESVIO_MAX = 1            # o quanto a rua pode fugir da linha do corte

def traçar_corte(eixo, ini, fim, vertical):
    """Desenha a rua do corte SERPENTEANDO em vez de em linha reta.

    O corte decide por onde a rua passa; o traçado decide como ela passa. A cada trecho
    a rua pode deslocar-se uma célula para o lado, e quando desloca eu acrescento a
    célula do cotovelo para o caminho não se partir. É o que tira o aspecto de régua sem
    quebrar a promessa da subdivisão: a rua continua separando os dois quarteirões.
    """
    desvio = 0
    for t in range(ini, fim):
        if random.random() < 0.22:
            novo = max(-DESVIO_MAX, min(DESVIO_MAX, desvio + random.choice([-1, 1])))
            if novo != desvio:
                # cotovelo: a célula do desvio antigo nesta fatia, para não haver salto
                a = (eixo + desvio, t) if vertical else (t, eixo + desvio)
                if livre(*a): rua.add(a)
                desvio = novo
        p = (eixo + desvio, t) if vertical else (t, eixo + desvio)
        if livre(*p): rua.add(p)
def subdividir(c0, l0, w, h, prof=0):
    grande = max(w, h)
    if grande < MIN_QUARTEIRAO * 2 + 1 or prof > 6:
        quarteiroes.append((c0, l0, w, h))
        return
    # Um em cada seis quarteirões fica inteiro: é o terreno grande onde cabe casarão,
    # pátio ou celeiro. Cidade em que TODO quarteirão tem o mesmo tamanho é maquete.
    if prof >= 2 and random.random() < 0.17:
        quarteiroes.append((c0, l0, w, h))
        return
    vertical = w >= h if abs(w - h) > 1 else random.random() < .5
    if vertical:
        corte = random.randint(c0 + MIN_QUARTEIRAO, c0 + w - MIN_QUARTEIRAO - 1)
        traçar_corte(corte, l0, l0 + h, vertical=True)
        subdividir(c0, l0, corte - c0, h, prof + 1)
        subdividir(corte + 1, l0, c0 + w - corte - 1, h, prof + 1)
    else:
        corte = random.randint(l0 + MIN_QUARTEIRAO, l0 + h - MIN_QUARTEIRAO - 1)
        traçar_corte(corte, c0, c0 + w, vertical=False)
        subdividir(c0, l0, w, corte - l0, prof + 1)
        subdividir(c0, corte + 1, w, l0 + h - corte - 1, prof + 1)

# ── 2. Terrenos grandes: reservados ANTES do corte ──────────────────────────────
# A fortaleza vem antes das casas, e a cidade cresce em volta dela.
def reservar(c0, l0, w, h):
    for c in range(c0, c0 + w):
        for l in range(l0, l0 + h):
            if ok(c, l): reservado.add((c, l))
    return (c0, l0, w, h)

CASTELO = reservar(11, 0, 8, 4)
FEIRA   = reservar(3, 7, 4, 3)
TEMPLO  = reservar(23, 6, 4, 4)

subdividir(0, 0, COLS, LINS)
print(f'{len(quarteiroes)} quarteirões')

# ── 3. Praças: abrem em cima da malha, engolindo o cruzamento ───────────────────
PRACA_R = (15, 6, 2.6)
PRACA_Q = (7, 3, 3, 2)
cc, cl, rr = PRACA_R
for c in range(COLS):
    for l in range(LINS):
        if math.hypot(c - cc, (l - cl) * 1.35) <= rr and livre(c, l): rua.add((c, l))
qc, ql, qw, qh = PRACA_Q
for c in range(qc, qc + qw):
    for l in range(ql, ql + qh):
        if livre(c, l): rua.add((c, l))

# ── 4. Vielas: só nos quarteirões fundos ───────────────────────────────────────
# Viela existe por necessidade. Se o quarteirão tem mais de 5 células de fundo, o miolo
# fica sem acesso — e é aí que a passagem aparece, terminando sem saída.
vielas = 0
for (c0, l0, w, h) in quarteiroes:
    if max(w, h) < 6: continue
    if random.random() < .35: continue
    if w >= h:
        c = c0 + w // 2
        for l in range(l0, l0 + max(2, h - 1)):
            if livre(c, l): rua.add((c, l)); vielas += 1
    else:
        l = l0 + h // 2
        for c in range(c0, c0 + max(2, w - 1)):
            if livre(c, l): rua.add((c, l)); vielas += 1

# ── 4b. Costura: nenhuma rua pode ficar ilhada ─────────────────────────────────
# A serpenteada às vezes faz duas ruas se desencontrarem no cruzamento, e o terreno
# reservado às vezes corta um trecho ao meio. O resultado é rua que não leva a lugar
# nenhum — no jogo, é o jogador preso. Aqui cada ilha é ligada à malha principal pelo
# caminho mais curto que existir, e a ligação vira rua de verdade.
from collections import deque as _deque

def componentes():
    vistos, grupos = set(), []
    for cel in rua:
        if cel in vistos: continue
        fila, g = _deque([cel]), [cel]
        vistos.add(cel)
        while fila:
            c, l = fila.popleft()
            for dc, dl in ((1,0),(-1,0),(0,1),(0,-1)):
                p = (c+dc, l+dl)
                if p in rua and p not in vistos:
                    vistos.add(p); fila.append(p); g.append(p)
        grupos.append(g)
    grupos.sort(key=len, reverse=True)
    return grupos

def costurar_malha():
    ligacoes = 0
    for _ in range(24):
        grupos = componentes()
        if len(grupos) <= 1: break
        principal = set(grupos[0])
        ilha = grupos[1]
        # busca em largura a partir da ilha até tocar a malha principal
        origem = {cel: None for cel in ilha}
        fila = _deque(ilha)
        destino = None
        while fila and not destino:
            c, l = fila.popleft()
            for dc, dl in ((1,0),(-1,0),(0,1),(0,-1)):
                p = (c+dc, l+dl)
                if not ok(*p) or p in reservado or p in origem: continue
                origem[p] = (c, l)
                if p in principal: destino = p; break
                fila.append(p)
        if not destino:
            # ilha realmente inalcançável (cercada de terreno reservado): apaga, porque
            # rua sem acesso é pior que nenhuma rua
            for cel in ilha: rua.discard(cel)
            continue
        p = destino
        while p and p not in ilha:
            rua.add(p); ligacoes += 1
            p = origem[p]
    return ligacoes

costuras = costurar_malha()

# ── 5. Portões e trilhas de terra ──────────────────────────────────────────────
PORTOES = []
for (c, l) in list(rua):
    if c == 0 or c == COLS-1 or l == 0 or l == LINS-1: PORTOES.append((c, l))
random.shuffle(PORTOES)
PORTOES = PORTOES[:4]
# Cada trilha é guardada como traçado ORDENADO, não como conjunto de células. Um
# conjunto perde a ordem, e sem ordem a pintura não sabe ligar um ponto ao próximo —
# sai bolha solta no mato em vez de caminho.
trilhas = []
for (pc, pl) in PORTOES:
    fora = (-1, 0) if pc == 0 else (1, 0) if pc == COLS-1 else (0, -1) if pl == 0 else (0, 1)
    c, l = pc, pl
    traco = [(c, l)]
    for i in range(14):
        c += fora[0]; l += fora[1]
        if fora[0]: l += random.choice([-1, 0, 0, 0, 1])
        else: c += random.choice([-1, 0, 0, 0, 1])
        traco.append((c, l))
        terra.add((c, l))
    trilhas.append(traco)

# ── 7. Auto-tile ────────────────────────────────────────────────────────────────
def tem(c, l): return (c, l) in rua
def escolher(c, l):
    n, e, s, o = tem(c,l-1), tem(c+1,l), tem(c,l+1), tem(c-1,l)
    v = (n, e, s, o)
    if all(v): return random.choice(CHEIOS), 0
    if v == (True, True, True, False):  return BORDA, math.pi/2
    if v == (True, False, True, True):  return BORDA, -math.pi/2
    if v == (False, True, True, True):  return BORDA, math.pi
    if v == (True, True, False, True):  return BORDA, 0
    if v == (True, False, True, False): return FAIXA, 0
    if v == (False, True, False, True): return FAIXA, math.pi/2
    if v == (False, True, True, False): return ESQ, 0
    if v == (False, False, True, True): return ESQ, math.pi/2
    if v == (True, False, False, True): return ESQ, math.pi
    if v == (True, True, False, False): return ESQ, -math.pi/2
    return COTOV, random.choice([0, math.pi/2, math.pi, -math.pi/2])

AREA = (X0 - CEL*2, Y0 - CEL*2, COLS*CEL + CEL*4, LINS*CEL + CEL*4)
ax, ay, aw, ah = AREA
props = [p for p in cfg['props'] if p['prop'] in cat
         and not (ax <= p['x'] <= ax+aw and ay <= p['y'] <= ay+ah)]
print(f'preservados fora da cidade: {len(props)}')

tam = {}
def escala(prop):
    if prop not in tam:
        im = Image.open(RAIZ/cat[prop]['sprite'])
        tam[prop] = (CEL/im.width, CEL/im.height)
    return tam[prop]

def add(prop, x, y, ex=1, ey=1, rot=0, flip=False):
    if prop not in cat: return
    props.append({'id': f'{prop}_{len(props):04d}', 'prop': prop, 'x': int(x), 'y': int(y),
                  'ex': round(ex,3), 'ey': round(ey,3), 'rot': round(rot,4), 'flipX': flip})

def centro(c, l): return (X0 + c*CEL + CEL/2, Y0 + l*CEL + CEL/2)

for (c, l) in sorted(rua):
    prop, rot = escolher(c, l)
    ex, ey = escala(prop)
    x, y = centro(c, l)
    add(prop, x, y, ex, ey, rot)

Path('/tmp/planta_cidade.json').write_text(json.dumps({
    'cel': CEL, 'x0': X0, 'y0': Y0, 'cols': COLS, 'lins': LINS,
    'rua': sorted(list(rua)), 'terra': sorted(list(terra)), 'trilhas': trilhas,
    'reservado': sorted(list(reservado)),
    'castelo': CASTELO, 'feira': FEIRA, 'templo': TEMPLO,
    'praca_r': PRACA_R, 'praca_q': PRACA_Q}), encoding='utf-8')

cfg['props'] = props
(RAIZ/'assets/mundo/mundo.json').write_text(json.dumps(cfg, indent=2, ensure_ascii=False),
                                            encoding='utf-8')
print(f'{len(rua)} células de rua · {vielas} de viela · {costuras} de costura · {len(terra)} de trilha')
print(f'terrenos reservados: castelo {CASTELO[2]}x{CASTELO[3]}, feira {FEIRA[2]}x{FEIRA[3]}, '
      f'templo {TEMPLO[2]}x{TEMPLO[3]} células')
print(f'{len(props)} objetos no mundo')
