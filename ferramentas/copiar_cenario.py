#!/usr/bin/env python3
"""
Reconstrói um cenário pintado como mapa de objetos + terreno pintado.

    python3 ferramentas/copiar_cenario.py assets/bg_custom_1785254692668_431.jpg

A ideia: o cenário original JÁ contém a informação de onde está cada coisa. Em vez de
adivinhar posições no olho, classifico cada pixel por cor (grama, terra, laje, água,
copa de árvore, rocha) e leio o desenho:

- o TERRENO vira a camada de pintura, com a trilha e as lajes exatamente onde estavam;
- as COPAS e ROCHAS viram ilhas de pixels, e cada ilha vira um objeto do catálogo,
  escolhido pelo tamanho dela.

O resultado não é uma cópia pixel a pixel — é a mesma planta baixa, montada com peças
que têm física e profundidade. É isso que separa uma foto de um lugar.
"""
import json, math, sys
from collections import deque
from pathlib import Path
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
# O cenário vira uma área ESCALA_MUNDO vezes maior. Em 3 o bosque fica com espaço de
# sobra para andar entre as árvores, e ainda deixa o resto do mundo livre para a cidade.
ESCALA_MUNDO = 3
RED = 4                   # a análise roda nesta redução


def classificar(im):
    """Devolve uma grade de rótulos por pixel reduzido."""
    p = im.resize((im.width // RED, im.height // RED), Image.LANCZOS).convert('RGB')
    px = p.load()
    w, h = p.size
    g = [[None] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            r, vd, b = px[x, y]
            mx, mn = max(r, vd, b), min(r, vd, b)
            sat = (mx - mn) / max(1, mx)
            lum = (r + vd + b) / 3
            # A ordem importa: água primeiro (é a mais distinta), depois os cinzas
            # separados dos marrons pela SATURAÇÃO — laje e terra têm luminância
            # parecida, e só a saturação diz qual é qual.
            if b > r + 20 and b > 110:                        g[y][x] = 'agua'
            elif sat < .20 and lum > 128:                     g[y][x] = 'laje'
            elif sat >= .20 and r > vd > b and lum > 118:     g[y][x] = 'terra'
            elif vd > r and lum < 95:                         g[y][x] = 'copa'
            elif sat < .26 and lum <= 128:                    g[y][x] = 'rocha'
            else:                                             g[y][x] = 'grama'
    return g, w, h


def ilhas(g, w, h, alvo, minimo):
    """Componentes conectados de um rótulo, com caixa e área."""
    visto = [[False] * w for _ in range(h)]
    saida = []
    for y0 in range(h):
        for x0 in range(w):
            if visto[y0][x0] or g[y0][x0] != alvo:
                continue
            fila = deque([(x0, y0)]); visto[y0][x0] = True
            minx = maxx = x0; miny = maxy = y0; area = 0
            while fila:
                x, y = fila.popleft(); area += 1
                minx, maxx = min(minx, x), max(maxx, x)
                miny, maxy = min(miny, y), max(maxy, y)
                for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    nx, ny = x+dx, y+dy
                    if 0 <= nx < w and 0 <= ny < h and not visto[ny][nx] and g[ny][nx] == alvo:
                        visto[ny][nx] = True; fila.append((nx, ny))
            if area >= minimo:
                saida.append({'x': minx, 'y': miny, 'w': maxx-minx+1, 'h': maxy-miny+1, 'area': area})
    return saida


def main():
    origem = Path(sys.argv[1] if len(sys.argv) > 1
                  else 'assets/bg_custom_1785254692668_431.jpg')
    im = Image.open(origem).convert('RGB')
    print(f'cenário: {origem.name}  {im.width}x{im.height}')
    g, w, h = classificar(im)

    conta = {}
    for linha in g:
        for v in linha: conta[v] = conta.get(v, 0) + 1
    total = w * h
    print('  ' + ' · '.join(f'{k} {100*v//total}%' for k, v in sorted(conta.items(), key=lambda kv: -kv[1])))

    # ── terreno: uma máscara por material, na escala do mundo ────────────────────
    LARG, ALT = im.width * ESCALA_MUNDO, im.height * ESCALA_MUNDO
    masc = {}
    for mat in ('terra', 'laje', 'agua'):
        # Só as manchas GRANDES do material entram no terreno. Tronco de árvore e
        # galho seco também são marrons, e sem esse filtro a trilha saía salpicada de
        # respingos de terra por baixo da mata inteira.
        grandes = {(x, y) for il in ilhas(g, w, h, mat, 45)
                   for y in range(il['y'], il['y'] + il['h'])
                   for x in range(il['x'], il['x'] + il['w'])
                   if g[y][x] == mat}
        m = Image.new('L', (w, h), 0)
        mp = m.load()
        for (x, y) in grandes: mp[x, y] = 255
        masc[mat] = m.resize((LARG, ALT), Image.LANCZOS).point(lambda v: 255 if v > 110 else 0)
    Path('/tmp/cenario_masc').mkdir(exist_ok=True)
    for k, v in masc.items(): v.save(f'/tmp/cenario_masc/{k}.png')

    # ── objetos: copas e rochas viram props pelo tamanho da ilha ─────────────────
    copas = ilhas(g, w, h, 'copa', 24)
    rochas = ilhas(g, w, h, 'rocha', 16)
    print(f'  {len(copas)} copas · {len(rochas)} rochas')

    ARVORES = [(2200, 'f1_01'), (1400, 'f1_06'), (900, 'mata1_02'), (520, 'f1_02'),
               (300, 'f1_03'), (170, 'f1_04'), (90, 'f1_05'), (0, 'f2_07')]
    PEDRAS  = [(900, 'lapide2_01'), (420, 'mata2_01'), (200, 'mata2_03'),
               (90, 'f4_10'), (0, 'f4_11')]

    def escolher(tabela, area):
        for lim, prop in tabela:
            if area >= lim: return prop
        return tabela[-1][1]

    import random
    random.seed(4321)
    props = []

    def plantar(prop, xr, yr, esc=1.0):
        props.append({'id': f'{prop}_{len(props):04d}', 'prop': prop,
                      'x': int(xr * RED * ESCALA_MUNDO), 'y': int(yr * RED * ESCALA_MUNDO),
                      'ex': round(esc, 2), 'ey': round(esc, 2), 'rot': 0,
                      'flipX': bool(random.getrandbits(1))})

    # Ilha pequena é um objeto; ilha grande é MATA. Preencher a mancha com árvores
    # espaçadas reproduz a borda de floresta do cenário — tratá-la como um objeto só
    # daria uma árvore do tamanho de um quarteirão.
    ILHA_GRANDE = 600
    # Espaçamento entre troncos. Subiu de 11 para 16: a mata anterior era um paredão
    # sem passagem, e o jogador precisa caminhar DENTRO do bosque, não em volta dele.
    PASSO = 16

    def preencher(ilha, tabela, celula):
        dentro = 0
        for yr in range(ilha['y'], ilha['y'] + ilha['h'], celula):
            for xr in range(ilha['x'], ilha['x'] + ilha['w'], celula):
                jx = xr + random.randint(-3, 3); jy = yr + random.randint(-3, 3)
                if not (0 <= jx < w and 0 <= jy < h) or g[jy][jx] != 'copa': continue
                dentro += 1
                # perto da borda de baixo da mancha entram as árvores maiores: é o que
                # dá camada, com a copa alta atrás e a frondosa na frente
                # O porte sai da ESPESSURA da mata naquele ponto, não da altura na
                # tela: pela altura, a beira de baixo de cada mancha virava uma parede
                # de árvores enormes lado a lado.
                espessura = 0
                for k in range(1, 14):
                    if jy + k < h and g[jy + k][jx] == 'copa': espessura += 1
                    else: break
                prop = escolher(tabela, 1400 if espessura >= 10 else
                                        700 if espessura >= 6 else
                                        320 if espessura >= 3 else 150)
                plantar(prop, jx, jy + 2, random.uniform(.85, 1.12))
        return dentro

    for c in copas:
        if c['area'] >= ILHA_GRANDE: preencher(c, ARVORES, PASSO)
        else:
            plantar(escolher(ARVORES, c['area']),
                    c['x'] + c['w'] / 2, c['y'] + c['h'], random.uniform(.9, 1.1))
    for r in rochas:
        plantar(escolher(PEDRAS, r['area']),
                r['x'] + r['w'] / 2, r['y'] + r['h'], random.uniform(.9, 1.15))

    # A orla: onde a mata encontra a grama, o cenário original tem moita e flor. Sem
    # isso a floresta termina num corte reto que entrega a montagem.
    MIUDO = ['f2_01','f2_02','f2_07','f2_08','f2_03','f4_01','f4_03','f4_05','f2_09','f2_11']
    orla = 0
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            if g[y][x] != 'grama': continue
            if g[y-1][x] != 'copa': continue          # logo abaixo da mata
            if random.random() > .18: continue
            plantar(random.choice(MIUDO), x, y + 1, random.uniform(.7, 1.05)); orla += 1
    print(f'  {orla} peças de orla')

    # ── O que faz deste bosque o Bosque dos Ecos ────────────────────────────────
    # Árvores de clave espalhadas na mata e notas douradas pairando na clareira: sem
    # elas o lugar é uma floresta bonita qualquer, e não o cenário de caçar Ecos.
    ARVORES_MUSICAIS = ['sagrado1_02', 'sagrado1_03']
    NOTAS = ['magico4_01', 'magico4_02', 'magico4_03']

    copa_em = lambda x, y: 0 <= x < w and 0 <= y < h and g[y][x] == 'copa'
    grama_em = lambda x, y: 0 <= x < w and 0 <= y < h and g[y][x] == 'grama'

    musicais = 0
    for _ in range(1400):
        x, y = random.randrange(w), random.randrange(h)
        if not copa_em(x, y) or not grama_em(x, y + 6): continue     # na beira da mata
        if musicais >= 22: break
        plantar(random.choice(ARVORES_MUSICAIS), x, y + 6, random.uniform(.9, 1.15))
        musicais += 1

    # a Árvore-Mãe, uma só, no ponto mais alto da mata do fundo
    alvo = min((c for c in copas if c['area'] >= ILHA_GRANDE),
               key=lambda c: c['y'], default=None)
    if alvo:
        plantar('sagrado1_01', alvo['x'] + alvo['w'] * .5, alvo['y'] + alvo['h'] * .35, 1.15)

    notas = 0
    for _ in range(1600):
        x, y = random.randrange(w), random.randrange(h)
        if not grama_em(x, y) or copa_em(x, y - 3): continue          # pairando na clareira
        if notas >= 26: break
        plantar(random.choice(NOTAS), x, y, random.uniform(.7, 1.1))
        notas += 1
    print(f'  {musicais} árvores de clave · {notas} notas douradas · Árvore-Mãe: {"sim" if alvo else "não"}')

    Path('/tmp/cenario_props.json').write_text(json.dumps(props, indent=1), encoding='utf-8')
    print(f'  {len(props)} objetos · máscaras em /tmp/cenario_masc · mundo {LARG}x{ALT}')


if __name__ == '__main__':
    main()
