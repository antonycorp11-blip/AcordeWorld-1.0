#!/usr/bin/env python3
"""
Põe todas as folhas do mesmo herói na MESMA escala e na mesma célula.

Cada folha volta do gerador com um tamanho próprio: a de caminhada veio com o
personagem de 193 px de altura, a de parado com 248 — 28% maior. Trocar de folha ao
soltar a tecla faria o herói crescer de repente, o que é pior que não ter idle.

O que este script faz: mede a altura do personagem em cada folha, escolhe a MENOR como
referência (reduzir preserva o desenho; ampliar pixel art inventa pixel), reescala as
outras por vizinho mais próximo para não borrar, e regrava todas com a mesma célula e
os pés na mesma linha de base.

Rodar sempre com TODAS as folhas de uma vez — a referência sai do conjunto, então
processar uma sozinha depois desalinharia de novo.
"""
import sys
from pathlib import Path
from PIL import Image

MARGEM = 6


def quadros_da_folha(caminho, cols, lins):
    """Recorta cada célula pelo conteúdo. As folhas já vêm sem fundo daqui."""
    im = Image.open(caminho).convert('RGBA')
    CW, CH = im.width // cols, im.height // lins
    saida = []
    for li in range(lins):
        for ci in range(cols):
            cel = im.crop((ci * CW, li * CH, (ci + 1) * CW, (li + 1) * CH))
            bb = cel.getbbox()
            saida.append(cel.crop(bb) if bb else None)
    return saida


def main(entradas):
    folhas = []
    for spec in entradas:
        caminho, cols, lins = spec.split(':')
        cols, lins = int(cols), int(lins)
        qs = quadros_da_folha(caminho, cols, lins)
        alt = max((q.height for q in qs if q), default=0)
        folhas.append({'caminho': caminho, 'cols': cols, 'lins': lins,
                       'quadros': qs, 'altura': alt})
        print(f'{Path(caminho).name:34} {cols}x{lins} · personagem com {alt} px de altura')

    referencia = min(f['altura'] for f in folhas)
    print(f'\nreferência: {referencia} px (a menor — reduzir preserva o desenho, '
          f'ampliar pixel art inventa pixel)')

    # Reescala e mede o maior quadro do conjunto inteiro, para a célula servir a todas.
    maxw = maxh = 0
    for f in folhas:
        f['escala'] = referencia / f['altura']
        novos = []
        for q in f['quadros']:
            if not q:
                novos.append(None); continue
            if abs(f['escala'] - 1) > 0.001:
                nw = max(1, round(q.width * f['escala']))
                nh = max(1, round(q.height * f['escala']))
                q = q.resize((nw, nh), Image.NEAREST)   # NEAREST: borda dura de pixel art
            novos.append(q)
            maxw = max(maxw, q.width); maxh = max(maxh, q.height)
        f['quadros'] = novos

    CW, CH = maxw + MARGEM * 2, maxh + MARGEM * 2
    print(f'célula comum: {CW}x{CH}\n')

    for f in folhas:
        nc, nl = f['cols'], f['lins']
        folha = Image.new('RGBA', (CW * nc, CH * nl), (0, 0, 0, 0))
        for i, q in enumerate(f['quadros']):
            if not q:
                continue
            ci, li = i % nc, i // nc
            x = ci * CW + (CW - q.width) // 2
            y = li * CH + (CH - MARGEM) - q.height   # pés na mesma linha, em TODAS as folhas
            folha.paste(q, (x, y), q)
        folha.save(f['caminho'])
        print(f"{Path(f['caminho']).name:34} regravada em {folha.width}x{folha.height} "
              f"(escala {f['escala']:.3f})")

    print(f'\nProporção da célula: {CW/CH:.3f} — use largura = altura * {CW/CH:.3f} '
          f'na caixa do corpo, senão o sprite estica.')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('uso: casar_folhas_heroi.py <arquivo.png:colunas:linhas> [...]')
        sys.exit(1)
    main(sys.argv[1:])
