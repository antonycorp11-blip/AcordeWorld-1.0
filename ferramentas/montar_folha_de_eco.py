#!/usr/bin/env python3
"""Monta a folha de um Eco na grade que o motor lê, a partir de uma folha solta.

POR QUE ISTO EXISTE. O motor desenha monstro por GRADE FIXA: `cols` x `rows`, com
`idleRow`, `walkRow`, `attackRow` e `deathRow` apontando para linhas inteiras. As folhas
geradas não vêm assim — cada linha tem um número diferente de quadros (4 a 17), o
espaçamento é irregular e as últimas colunas trazem o EFEITO do golpe, não a criatura.
Ligar a folha crua faria o bicho piscar entre poses de tamanhos diferentes e, no meio do
ataque, virar um raio de luz.

Então aqui a folha é DESMONTADA quadro a quadro e REMONTADA em 5 x 4, do mesmo tamanho
das folhas de Eco que já existem (1000x1000, célula 200x250).

Duas decisões que valem explicar:

1. Cada quadro é ancorado pelo PÉ, no centro de baixo da célula. Ancorar pelo topo ou
   pelo centro faz a criatura subir e descer sozinha entre quadros de alturas
   diferentes — o mesmo defeito que o `corpo` errado causa no herói.

2. Na linha de ataque, os quadros de EFEITO puro (o raio, a explosão) são descartados por
   proporção: eles são largos e baixos, a criatura é compacta. Sem essa peneira o ataque
   terminava com o bicho sumindo e um feixe no lugar dele.

Uso:
    python3 ferramentas/montar_folha_de_eco.py <folha.png> <nota>     # ex.: do_s
"""
from PIL import Image, ImageFilter
import numpy as np
import os, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAI = os.path.join(RAIZ, 'assets/monsters')
LIMITE = 58
COLS, ROWS = 5, 4
CELA_W, CELA_H = 200, 250


def mascara(im):
    a = np.asarray(im.convert('RGB')).astype(np.int16)
    mag = np.minimum(a[:, :, 0], a[:, :, 2]) - a[:, :, 1]
    m = Image.fromarray(np.where(mag > LIMITE, 0, 255).astype(np.uint8), 'L')
    return m.filter(ImageFilter.MinFilter(3))


def bandas(arr, minimo=20):
    lin = arr.sum(axis=1) > 0
    out, ini = [], None
    for y, v in enumerate(lin):
        if v and ini is None: ini = y
        elif not v and ini is not None:
            if y - ini >= minimo: out.append((ini, y))
            ini = None
    if ini is not None: out.append((ini, len(lin)))
    return out


def quadros(arr, y0, y1, minimo=12):
    col = arr[y0:y1].sum(axis=0) > 0
    out, ini = [], None
    for x, v in enumerate(col):
        if v and ini is None: ini = x
        elif not v and ini is not None:
            if x - ini >= minimo: out.append((ini, x))
            ini = None
    if ini is not None: out.append((ini, len(col)))
    return out


def so_criatura(rgba, caixas, y0, y1, cortar_efeito=False, regua=None):
    """Fica so com o BICHO.

    Duas coisas entram na segmentacao e nao sao quadro de animacao: a faisca solta, que e
    um punhado de pixels entre uma pose e outra, e — na linha de ataque — o efeito puro do
    golpe, que e largo, baixo e sem silhueta. Sem esta peneira o `cinco()` amostrava
    faisca no lugar da criatura, e a folha saia com celulas quase vazias.
    """
    medidas = []
    for x0, x1 in caixas:
        rec = rgba.crop((x0, y0, x1, y1))
        bb = rec.getchannel('A').getbbox()
        if not bb: continue
        w, h = bb[2] - bb[0], bb[3] - bb[1]
        area = int((np.asarray(rec.getchannel('A')) > 8).sum())
        medidas.append({'cx': (x0, x1), 'w': w, 'h': h, 'area': area})
    if not medidas: return []
    med = lambda k: sorted(m[k] for m in medidas)[len(medidas) // 2]

    # A REGUA VEM DE FORA quando existe.
    #
    # Na linha de ataque a MAIORIA dos quadros e efeito — o feixe, a explosao — entao a
    # mediana da propria linha sai do efeito, e um filtro relativo a ela mantem o efeito e
    # descarta a criatura. Foi o que aconteceu: tres folhas sairam com a linha de ataque
    # cheia de losangos e sem bicho nenhum. A linha PARADA e toda criatura, sempre; ela e
    # a referencia honesta de quanto mede este bicho.
    hMed = (regua or {}).get('h') or med('h')
    aMed = (regua or {}).get('area') or med('area')

    def vale(m):
        if m['h'] < hMed * 0.55: return False       # faisca: baixa demais
        if m['area'] < aMed * 0.30: return False    # faisca: rala demais
        if cortar_efeito:
            if m['h'] > hMed * 1.6: return False    # explosao: alta demais
            if m['w'] > hMed * 1.8: return False    # feixe: comprido demais
        return True
    bons = [m['cx'] for m in medidas if vale(m)]
    return bons or [m['cx'] for m in medidas]


def regua_da_banda(rgba, arr, banda):
    """Quanto mede a criatura, medido na linha PARADA — que nunca tem efeito."""
    y0, y1 = banda
    hs, ars = [], []
    for x0, x1 in quadros(arr, y0, y1):
        rec = rgba.crop((x0, y0, x1, y1))
        bb = rec.getchannel('A').getbbox()
        if not bb: continue
        hs.append(bb[3] - bb[1])
        ars.append(int((np.asarray(rec.getchannel('A')) > 8).sum()))
    if not hs: return None
    return {'h': sorted(hs)[len(hs) // 2], 'area': sorted(ars)[len(ars) // 2]}


def cinco(lista):
    """Exatamente cinco quadros: sobra é amostrada, falta é repetida."""
    if not lista: return []
    if len(lista) >= COLS:
        return [lista[round(i * (len(lista) - 1) / (COLS - 1))] for i in range(COLS)]
    return (lista * COLS)[:COLS]


def montar(arq, nota):
    im = Image.open(arq).convert('RGB')
    m = mascara(im)
    rgba = im.convert('RGBA'); rgba.putalpha(m)
    arr = np.asarray(m) > 0

    bs = bandas(arr)
    if len(bs) < 2:
        print('  AVISO: só %d banda(s) — confira a folha.' % len(bs)); return

    regua = regua_da_banda(rgba, arr, bs[0])

    def recorta(banda, filtrar=False):
        y0, y1 = banda
        cx = quadros(arr, y0, y1)
        # A peneira vale para TODA linha, nao so para a do ataque: faisca solta aparece
        # entre as poses em qualquer fileira. E a regua e sempre a da linha parada.
        cx = so_criatura(rgba, cx, y0, y1, cortar_efeito=filtrar, regua=regua)
        pecas = []
        for x0, x1 in cx:
            rec = rgba.crop((x0, y0, x1, y1))
            bb = rec.getchannel('A').getbbox()
            if bb: pecas.append(rec.crop(bb))
        return pecas

    parado  = recorta(bs[0])
    andando = recorta(bs[1]) if len(bs) > 1 else parado
    ataque  = recorta(bs[-1], filtrar=True) or (recorta(bs[2]) if len(bs) > 2 else parado)

    # deathRow: as folhas não trazem morte. O Eco é CAPTURADO, não morto — a linha existe
    # para o motor não ficar sem quadro, e repete a parada.
    linhas = [cinco(parado), cinco(andando), cinco(ataque), cinco(parado)]

    folha = Image.new('RGBA', (COLS * CELA_W, ROWS * CELA_H), (0, 0, 0, 0))
    for r, fila in enumerate(linhas):
        for c, peca in enumerate(fila):
            p = peca.copy()
            p.thumbnail((CELA_W - 12, CELA_H - 12), Image.LANCZOS)
            # ancorado pelo PÉ, centro de baixo
            x = c * CELA_W + (CELA_W - p.size[0]) // 2
            y = r * CELA_H + (CELA_H - 6 - p.size[1])
            folha.paste(p, (x, y), p)

    p = os.path.join(SAI, 'eco_%s.png' % nota)
    folha.save(p, optimize=True)
    print('    eco_%-6s %s  (parado %d · andando %d · ataque %d)'
          % (nota, folha.size, len(parado), len(andando), len(ataque)))


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(__doc__); sys.exit(2)
    montar(sys.argv[1], sys.argv[2])
