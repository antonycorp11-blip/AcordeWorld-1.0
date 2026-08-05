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
import json
import sys
from pathlib import Path
from PIL import Image

MARGEM = 6


def altura_do_corpo(q):
    """Altura dos PÉS ao topo da CABEÇA, ignorando o que for fino.

    Medir a altura total do quadro não serve: no golpe vertical a espada erguida acima
    da cabeça faz a silhueta ter 278 px contra os 193 da caminhada, e escalar por isso
    encolheria o personagem a 60% justamente onde ele deveria ficar do mesmo tamanho.

    O truque é que a espada é FINA e a cabeça é LARGA. Descendo do topo, a primeira
    linha que ocupa mais de um terço da largura do corpo é o alto do cabelo; tudo acima
    disso é lâmina, rastro ou mecha solta.
    """
    if not q:
        return 0
    px = q.load()
    larguras = []
    for y in range(q.height):
        xs = [x for x in range(q.width) if px[x, y][3] > 0]
        larguras.append((max(xs) - min(xs) + 1) if xs else 0)
    corpo = max(larguras) if larguras else 0
    if not corpo:
        return 0
    limite = corpo * 0.34
    topo = next((y for y, w in enumerate(larguras) if w >= limite), 0)
    base = max((y for y, w in enumerate(larguras) if w > 0), default=q.height - 1)
    return base - topo + 1


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
        # Mediana das medidas de rosto: um quadro isolado pode ter o rosto meio virado
        # ou coberto pela lâmina, e a mediana ignora esses sem precisar de exceção.
        # Mediana e não máximo: um quadro agachado ou muito inclinado mede menos, e a
        # mediana ignora esses extremos sem precisar de exceção.
        medidas = sorted(x for x in (altura_do_corpo(q) for q in qs if q) if x > 3)
        alt = medidas[len(medidas) // 2] if medidas else 0
        folhas.append({'caminho': caminho, 'cols': cols, 'lins': lins,
                       'quadros': qs, 'altura': alt})
        print(f'{Path(caminho).name:34} {cols}x{lins} · corpo com {alt} px de altura')

    referencia = min(f['altura'] for f in folhas if f['altura'])
    print(f'\nrégua: corpo de {referencia} px (o menor — reduzir preserva o desenho, '
          f'ampliar pixel art inventa pixel)')

    # Reescala e mede o maior quadro do conjunto inteiro, para a célula servir a todas.
    maxw = maxh = 0
    for f in folhas:
        f['escala'] = referencia / f['altura'] if f['altura'] else 1
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

    # ALTURA comum, LARGURA por folha. A folha de ataque é muito mais larga que as
    # outras porque o rastro da espada se estende para o lado; forçar todas na largura
    # dela deixaria caminhada e parado com metade da célula vazia. O que precisa casar é
    # a altura e a linha dos pés — com elas iguais, o desenho pode calcular a largura
    # pela proporção da própria folha e o personagem sai do mesmo tamanho em todas.
    CH = maxh + MARGEM * 2
    print(f'altura de célula comum: {CH}\n')

    for f in folhas:
        nc, nl = f['cols'], f['lins']
        CW = max(q.width for q in f['quadros'] if q) + MARGEM * 2
        folha = Image.new('RGBA', (CW * nc, CH * nl), (0, 0, 0, 0))
        for i, q in enumerate(f['quadros']):
            if not q:
                continue
            ci, li = i % nc, i // nc
            x = ci * CW + (CW - q.width) // 2
            y = li * CH + (CH - MARGEM) - q.height   # pés na mesma linha, em TODAS as folhas
            folha.paste(q, (x, y), q)
        folha.save(f['caminho'])
        print(f"{Path(f['caminho']).name:34} {folha.width}x{folha.height} · "
              f"célula {CW}x{CH} · escala {f['escala']:.3f} · proporção {CW/CH:.3f}")

    # Ficha de medidas. Sem ela o motor teria que desenhar pela CÉLULA, e a célula é
    # mais alta que o personagem para caber a espada erguida do golpe vertical: o herói
    # sairia com metade do tamanho justamente nessa folha. Com `corpo` e `base` o desenho
    # escala pelo CORPO e ancora a linha dos PÉS, então toda folha nova entra certa sem
    # ninguém ajustar número na mão.
    ficha = {}
    for f in folhas:
        CW = max(q.width for q in f['quadros'] if q) + MARGEM * 2
        ficha[Path(f['caminho']).name] = {
            'cols': f['cols'], 'rows': f['lins'],
            'celula': [CW, CH],
            'corpo': round(f['altura'] * f['escala']),   # altura pés→cabeça, em pixels
            'base': CH - MARGEM,                          # onde estão os pés na célula
        }
    destino = Path(folhas[0]['caminho']).parent / 'achilles_folhas.json'
    destino.write_text(json.dumps(ficha, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f'\nficha de medidas: {destino}')
    print('  o desenho escala pelo CORPO e ancora os PÉS, não pela célula.')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('uso: casar_folhas_heroi.py <arquivo.png:colunas:linhas> [...]')
        sys.exit(1)
    main(sys.argv[1:])
