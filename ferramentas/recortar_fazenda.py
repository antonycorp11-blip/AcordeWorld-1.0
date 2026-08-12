#!/usr/bin/env python3
"""Recorta as folhas da fazenda em sprites soltos.

Mesmo recorte que o resto do projeto usa: mag = min(R,B) - G, limite ~58, e erosao de 1px
para matar a franja roxa. As folhas vem com ROTULO DE TEXTO branco, que precisa sair antes
da segmentacao, senao cada palavra vira um "sprite".
"""
from PIL import Image, ImageFilter
import os, sys, json
from collections import deque

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT = os.path.join(RAIZ, 'assets/folhas_fazenda')
SAI = os.path.join(RAIZ, 'assets/props')
LIMITE, MIN_AREA = 58, 900

def mascara(im):
    px = im.convert('RGB').load()
    w, h = im.size
    m = Image.new('L', (w, h), 0)
    mp = m.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            mp[x, y] = 0 if (min(r, b) - g) > LIMITE else 255
    return m.filter(ImageFilter.MinFilter(3))   # erosao: come a franja roxa

def eh_texto(im, cx):
    """Rotulo e branco/preto sem cor; sprite tem saturacao. Posicao nao serve de criterio:
    os rotulos aparecem em varias colunas dependendo do tamanho da planta."""
    px = im.convert('RGB').load()
    x0, y0, x1, y1 = cx
    coloridos = tot = 0
    for y in range(y0, y1):
        for x in range(x0, x1):
            r, g, b = px[x, y]
            if (min(r, b) - g) > LIMITE: continue      # fundo magenta
            tot += 1
            mx, mn = max(r, g, b), min(r, g, b)
            sat = 0 if mx == 0 else (mx - mn) / mx
            if sat > 0.22 and mx > 40: coloridos += 1
    if tot < 40: return True
    # Duas peneiras: pouca cor OU quase tudo branco. O JPEG suja o branco com franja
    # colorida, entao so a saturacao deixava passar letreiro grande e chapado.
    branco = 0
    for y in range(y0, y1):
        for x in range(x0, x1):
            r, g, b = px[x, y]
            if (min(r, b) - g) > LIMITE: continue
            if min(r, g, b) > 150: branco += 1
    return (coloridos / tot) < 0.20 or (branco / tot) > 0.55

def blobs(m):
    w, h = m.size
    mp = m.load()
    visto = bytearray(w * h)
    achados = []
    for y0 in range(h):
        for x0 in range(w):
            if mp[x0, y0] == 0 or visto[y0 * w + x0]: continue
            q = deque([(x0, y0)]); visto[y0 * w + x0] = 1
            xa = xb = x0; ya = yb = y0; area = 0
            while q:
                x, y = q.popleft(); area += 1
                if x < xa: xa = x
                if x > xb: xb = x
                if y < ya: ya = y
                if y > yb: yb = y
                for dx, dy in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,-1),(1,-1),(-1,1)):
                    nx, ny = x+dx, y+dy
                    if 0 <= nx < w and 0 <= ny < h and not visto[ny*w+nx] and mp[nx, ny]:
                        visto[ny*w+nx] = 1; q.append((nx, ny))
            if area >= MIN_AREA: achados.append((xa, ya, xb+1, yb+1))
    return achados

def juntar(caixas, folga=6):
    """Planta e sombra viram blobs separados; junta o que se sobrepoe de perto."""
    mudou = True
    while mudou:
        mudou = False
        for i in range(len(caixas)):
            for j in range(i+1, len(caixas)):
                a, b = caixas[i], caixas[j]
                if (a[0]-folga < b[2] and b[0]-folga < a[2] and
                    a[1]-folga < b[3] and b[1]-folga < a[3]):
                    caixas[i] = (min(a[0],b[0]), min(a[1],b[1]), max(a[2],b[2]), max(a[3],b[3]))
                    caixas.pop(j); mudou = True; break
            if mudou: break
    return caixas

def recortar(arq, prefixo):
    im = Image.open(os.path.join(ENT, arq)).convert('RGB')
    m = mascara(im)
    cx = [c for c in juntar(blobs(m)) if not eh_texto(im, c)]
    # ordena em linhas (por y) e depois por x, como se le
    cx.sort(key=lambda c: (round(c[1] / 60), c[0]))
    rgba = im.convert('RGBA'); rgba.putalpha(m)
    # Agrupa em LINHAS pela faixa de y: e isso que diz qual cultura e qual estagio.
    linhas, atual, ref = [], [], None
    for c in cx:
        centro = (c[1] + c[3]) / 2
        if ref is None or abs(centro - ref) < 55: atual.append(c)
        else: linhas.append(atual); atual = [c]
        ref = centro if ref is None else (ref * 0.6 + centro * 0.4)
    if atual: linhas.append(atual)
    feitos = []
    n = 0
    for li, linha in enumerate(linhas):
        for ci, (x0, y0, x1, y1) in enumerate(sorted(linha, key=lambda c: c[0])):
            n += 1
            nome = '%s_%02d.png' % (prefixo, n)
            rgba.crop((x0, y0, x1, y1)).save(os.path.join(SAI, nome))
            feitos.append({'arquivo': nome, 'linha': li, 'coluna': ci,
                           'w': x1-x0, 'h': y1-y0})
    return feitos

FOLHAS = [
 ('Pixel_art_musical_crop_sprites_202608112106.jpeg', 'faz_cult'),
 ('Pixel_art_tilled_soil_tileset_202608112106.jpeg',  'faz_solo'),
 ('Pixel_art_farm_tileset_grid_202608112106.jpeg',    'faz_ilha'),
 ('Pixel_art_fantasy_pet_habitats_202608112106.jpeg', 'faz_hab'),
 ('Pixel_art_farm_sprite_sheet_202608112106.jpeg',    'faz_estr'),
 ('Pixel_art_farm_decoration_sprite…_202608112106.jpeg','faz_deco'),
 ('Farm_inventory_pixel_art_icons_202608112106.jpeg', 'faz_item'),
]
if __name__ == '__main__':
    total = 0
    manifesto = {}
    for arq, pref in FOLHAS:
        if not os.path.exists(os.path.join(ENT, arq)):
            print('FALTA', arq); continue
        f = recortar(arq, pref)
        total += len(f)
        manifesto[pref] = f
        linhas = max((x['linha'] for x in f), default=-1) + 1
        print('%-14s %2d sprites em %d linha(s)' % (pref, len(f), linhas))
    with open(os.path.join(RAIZ, 'assets/folhas_fazenda/manifesto.json'), 'w') as fp:
        json.dump(manifesto, fp, ensure_ascii=False, indent=1)
    print('\ntotal:', total)
