#!/usr/bin/env python3
"""
Normaliza uma folha de personagem: recorta cada quadro pelo conteúdo e reancora todos
na mesma grade, com os PÉS na mesma linha e o corpo centrado.

Por que isso importa mais do que parece: numa folha desenhada à mão (ou gerada), cada
quadro fica numa posição levemente diferente dentro da sua célula. O jogo troca os
quadros dezenas de vezes por segundo, e essa diferença vira tremor — o personagem
"flutua" e "escorrega" enquanto anda. Alinhar pelos pés é o que separa movimentação
amadora de profissional.

    python3 ferramentas/normalizar_heroi.py "Achilles sprites.png" assets/achilles.png
"""
import sys
from collections import deque
from pathlib import Path
from PIL import Image

LIMITE_FUNDO = 236     # a partir daqui o pixel é fundo claro
MARGEM = 6


def bandas(perfil, limiar=2):
    saida, dentro = [], False
    for i, v in enumerate(perfil):
        if v > limiar and not dentro:
            ini, dentro = i, True
        elif v <= limiar and dentro:
            saida.append((ini, i)); dentro = False
    if dentro:
        saida.append((ini, len(perfil)))
    return saida


def tirar_fundo(rec):
    """Fundo = claro CONECTADO À BORDA do quadro. O branco de dentro do desenho (o
    branco dos olhos, o metal claro da armadura) fica."""
    w, h = rec.size
    px = rec.load()
    claro = lambda x, y: (min(px[x, y][:3]) >= LIMITE_FUNDO)
    visto = bytearray(w * h)
    fila = deque()
    def semear(x, y):
        i = y * w + x
        if not visto[i] and claro(x, y):
            visto[i] = 1; fila.append((x, y))
    for x in range(w):
        semear(x, 0); semear(x, h - 1)
    for y in range(h):
        semear(0, y); semear(w - 1, y)
    while fila:
        x, y = fila.popleft()
        r, g, b, _ = px[x, y]
        px[x, y] = (r, g, b, 0)
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h:
                i = ny * w + nx
                if not visto[i] and claro(nx, ny):
                    visto[i] = 1; fila.append((nx, ny))
    return rec


def main():
    origem = Path(sys.argv[1]); destino = Path(sys.argv[2])
    im = Image.open(origem).convert('RGB')
    w, h = im.size
    px = im.load()
    tinta = lambda x, y: min(px[x, y]) < LIMITE_FUNDO

    fil = bandas([sum(1 for x in range(0, w, 3) if tinta(x, y)) for y in range(h)])
    col = bandas([sum(1 for y in range(0, h, 3) if tinta(x, y)) for x in range(w)])
    print(f'folha {w}x{h} · {len(fil)} fileiras · {len(col)} colunas')

    rgba = im.convert('RGBA')
    quadros = []   # [(fileira, coluna, recorte, caixa)]
    for fi, (y0, y1) in enumerate(fil):
        for ci, (x0, x1) in enumerate(col):
            rec = rgba.crop((x0 - 4, y0 - 4, x1 + 4, y1 + 4))
            rec = tirar_fundo(rec)
            caixa = rec.getbbox()
            if not caixa:
                continue
            rec = rec.crop(caixa)
            quadros.append((fi, ci, rec))

    larguraMax = max(q[2].width for q in quadros)
    alturaMax = max(q[2].height for q in quadros)
    CW = larguraMax + MARGEM * 2
    CH = alturaMax + MARGEM * 2
    print(f'{len(quadros)} quadros · célula normalizada {CW}x{CH} '
          f'(maior quadro {larguraMax}x{alturaMax})')

    folha = Image.new('RGBA', (CW * len(col), CH * len(fil)), (0, 0, 0, 0))
    for fi, ci, rec in quadros:
        # centro horizontal do corpo e PÉ na mesma linha em todos os quadros
        x = ci * CW + (CW - rec.width) // 2
        y = fi * CH + (CH - MARGEM) - rec.height
        folha.paste(rec, (x, y), rec)

    destino.parent.mkdir(parents=True, exist_ok=True)
    folha.save(destino)
    print(f'gravado: {destino}  {folha.width}x{folha.height}  '
          f'cols={len(col)} rows={len(fil)} célula={CW}x{CH}')


if __name__ == '__main__':
    main()
