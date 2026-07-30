#!/usr/bin/env python3
"""
Recorta uma folha de assets de fundo branco em sprites PNG individuais.

    python3 ferramentas/recortar_props.py folha.jpeg

Como funciona, e por que assim:

1. O fundo é o branco CONECTADO À BORDA, encontrado por preenchimento a partir das
   quatro laterais. Apagar todo pixel branco esburacaria os desenhos — o tronco da
   bétula é quase branco, e há brilho branco dentro de folha e pedra. Entrando de fora
   para dentro, o branco interno sobrevive.

2. O que sobra é rotulado em componentes conectados: cada ilha de pixels vira um
   sprite. É isso que separa "uma árvore" de "a árvore vizinha" sem ninguém dizer onde
   uma acaba.

3. As fileiras da folha são detectadas por agrupamento vertical dos centros, e servem
   para dar categoria — na prática o artista desenha por fileira: árvores em cima,
   moitas depois, chão embaixo.

Sem numpy nem OpenCV de propósito: só PIL, que já está aqui. O preenchimento é por
linhas de varredura (scanline), que é o que faz 4 milhões de pixels rodarem em segundos
em Python puro.
"""
import json
import sys
from collections import deque
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
DESTINO = RAIZ / 'assets' / 'props'

LIMITE_BRANCO = 238      # a partir daqui o pixel conta como fundo
AREA_MINIMA = 120        # em pixels da máscara reduzida
MARGEM = 2               # folga em volta do recorte
ESCALA = 4               # a busca de ilhas roda nesta redução


def mascara_branca(im):
    """'L' com 255 onde o pixel é branco. Feito com operações do PIL, que rodam em C —
    o mesmo cálculo em laço de Python leva minutos numa folha de 4 megapixels."""
    r, g, b = im.split()
    from PIL import ImageChops
    minimo = ImageChops.darker(ImageChops.darker(r, g), b)
    return minimo.point(lambda v: 255 if v >= LIMITE_BRANCO else 0)


def fundo_alcancavel(branca):
    """Preenchimento a partir da borda, em escala reduzida.

    Reduzir é o que torna isto viável: 4x menos lado são 16x menos pixels. O fundo é uma
    região enorme e contínua, então ele sobrevive à redução sem mudar de forma; o que se
    perde são frestas de um pixel entre dois desenhos, e perder uma fresta só deixa um
    resto de branco que ninguém vê.
    """
    pequena = branca.resize((max(1, branca.width // ESCALA), max(1, branca.height // ESCALA)),
                            Image.NEAREST)
    w, h = pequena.size
    b = bytearray(pequena.tobytes())
    fundo = bytearray(w * h)
    fila = deque()

    def semear(x, y):
        i = y * w + x
        if b[i] and not fundo[i]:
            fundo[i] = 1
            fila.append((x, y))

    for x in range(w):
        semear(x, 0); semear(x, h - 1)
    for y in range(h):
        semear(0, y); semear(w - 1, y)

    while fila:
        x, y = fila.popleft()
        base = y * w
        esq = x
        while esq > 0 and b[base + esq - 1]:
            esq -= 1; fundo[base + esq] = 1
        dir_ = x
        while dir_ < w - 1 and b[base + dir_ + 1]:
            dir_ += 1; fundo[base + dir_] = 1
        for vy in (y - 1, y + 1):
            if vy < 0 or vy >= h:
                continue
            vbase = vy * w
            for vx in range(esq, dir_ + 1):
                if b[vbase + vx] and not fundo[vbase + vx]:
                    fundo[vbase + vx] = 1
                    fila.append((vx, vy))
    return fundo, w, h


# Buracos internos: branco cercado pelo desenho. O carvalho tem uma clareira de fundo
# entre os galhos, e preservá-la deixava uma mancha branca na copa. Já a casca da bétula
# e o brilho na pedra são branco disperso e pequeno — por isso o corte é por ÁREA, não
# por cor: ilha grande de branco é fundo esquecido; ilha pequena é desenho.
LIMITE_BURACO = 10       # em pixels da máscara reduzida (~160px na resolução cheia)


def furar_buracos(branca_pequena, fundo, w, h):
    b = bytearray(branca_pequena)
    visto = bytearray(w * h)
    furados = 0
    for y0 in range(h):
        base0 = y0 * w
        for x0 in range(w):
            i0 = base0 + x0
            if not b[i0] or fundo[i0] or visto[i0]:
                continue
            pilha = [(x0, y0)]; visto[i0] = 1; ilha = [i0]
            while pilha:
                x, y = pilha.pop()
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if nx < 0 or ny < 0 or nx >= w or ny >= h:
                        continue
                    j = ny * w + nx
                    if not b[j] or fundo[j] or visto[j]:
                        continue
                    visto[j] = 1; ilha.append(j); pilha.append((nx, ny))
            if len(ilha) >= LIMITE_BURACO:
                for j in ilha:
                    fundo[j] = 1
                furados += 1
    return furados


def componentes(fundo, w, h):
    """Caixas das ilhas de não-fundo (8 vizinhos), na escala reduzida."""
    visto = bytearray(w * h)
    caixas = []
    for y0 in range(h):
        base0 = y0 * w
        for x0 in range(w):
            i0 = base0 + x0
            if fundo[i0] or visto[i0]:
                continue
            pilha = [(x0, y0)]
            visto[i0] = 1
            minx = maxx = x0; miny = maxy = y0; area = 0
            while pilha:
                x, y = pilha.pop()
                area += 1
                if x < minx: minx = x
                if x > maxx: maxx = x
                if y < miny: miny = y
                if y > maxy: maxy = y
                for dy in (-1, 0, 1):
                    ny = y + dy
                    if ny < 0 or ny >= h:
                        continue
                    nbase = ny * w
                    for dx in (-1, 0, 1):
                        nx = x + dx
                        if nx < 0 or nx >= w:
                            continue
                        j = nbase + nx
                        if fundo[j] or visto[j]:
                            continue
                        visto[j] = 1
                        pilha.append((nx, ny))
            if area >= AREA_MINIMA:
                caixas.append({'x': minx * ESCALA, 'y': miny * ESCALA,
                               'w': (maxx - minx + 1) * ESCALA,
                               'h': (maxy - miny + 1) * ESCALA,
                               'area': area * ESCALA * ESCALA})
    return caixas


def fileiras(caixas, tolerancia=0.55):
    """Agrupa as caixas em fileiras pelo centro vertical."""
    if not caixas:
        return []
    ordenadas = sorted(caixas, key=lambda c: c['y'] + c['h'] / 2)
    grupos = [[ordenadas[0]]]
    for c in ordenadas[1:]:
        ultimo = grupos[-1]
        centro = c['y'] + c['h'] / 2
        ref = sum(g['y'] + g['h'] / 2 for g in ultimo) / len(ultimo)
        altura = max(g['h'] for g in ultimo)
        if abs(centro - ref) <= altura * tolerancia:
            ultimo.append(c)
        else:
            grupos.append([c])
    for g in grupos:
        g.sort(key=lambda c: c['x'])
    return grupos


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    origem = Path(sys.argv[1])
    im = Image.open(origem).convert('RGB')
    w, h = im.size
    print(f'folha: {origem.name}  {w}x{h}')

    from PIL import ImageChops
    branca = mascara_branca(im)
    fundo_p, pw, ph = fundo_alcancavel(branca)
    pequena = branca.resize((pw, ph), Image.NEAREST).tobytes()
    furados = furar_buracos(pequena, fundo_p, pw, ph)
    print(f'fundo: {sum(fundo_p) * 100 // (pw * ph)}% da imagem · {furados} buraco(s) interno(s) abertos')

    caixas = componentes(fundo_p, pw, ph)
    print(f'{len(caixas)} objetos encontrados')
    grupos = fileiras(caixas)
    print(f'{len(grupos)} fileiras')

    # Alpha em resolução cheia: fundo = branco E alcançável desde a borda. Assim o branco
    # de dentro do desenho (casca da bétula, brilho na pedra) fica opaco.
    peq = Image.frombytes('L', (pw, ph), bytes(bytearray(255 if v else 0 for v in fundo_p)))
    fundo_cheio = ImageChops.multiply(branca, peq.resize((w, h), Image.NEAREST))
    alpha = ImageChops.invert(fundo_cheio)
    rgba = im.convert('RGBA')
    rgba.putalpha(alpha)

    DESTINO.mkdir(parents=True, exist_ok=True)
    saida = []
    for nf, grupo in enumerate(grupos, 1):
        for ni, c in enumerate(grupo, 1):
            x0 = max(0, c['x'] - MARGEM); y0 = max(0, c['y'] - MARGEM)
            x1 = min(w, c['x'] + c['w'] + MARGEM); y1 = min(h, c['y'] + c['h'] + MARGEM)
            recorte = rgba.crop((x0, y0, x1, y1))
            caixa = recorte.getbbox()          # apara a folga que sobrou
            if caixa:
                recorte = recorte.crop(caixa)
            nome = f'f{nf}_{ni:02d}.png'
            recorte.save(DESTINO / nome)
            saida.append({'arquivo': f'assets/props/{nome}', 'fileira': nf,
                          'x': x0, 'y': y0, 'w': recorte.width, 'h': recorte.height})
    rel = RAIZ / 'assets' / 'props' / '_recorte.json'
    rel.write_text(json.dumps({'folha': origem.name, 'sprites': saida},
                              indent=2, ensure_ascii=False), encoding='utf-8')
    print(f'{len(saida)} PNGs em assets/props/ · relatório em {rel.name}')
    for nf, grupo in enumerate(grupos, 1):
        alturas = [c['h'] for c in grupo]
        print(f'  fileira {nf}: {len(grupo)} objetos, altura {min(alturas)}-{max(alturas)}px')
    return 0


if __name__ == '__main__':
    sys.exit(main())
