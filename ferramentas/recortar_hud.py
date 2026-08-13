#!/usr/bin/env python3
"""Recorta os botões redondos do HUD de uma folha sobre magenta.

Os botões vêm numa fileira, e a folha traz TAMBÉM o rótulo escrito embaixo de cada um
("BOLSA", "PERSONAGEM"...). O rótulo não pode entrar no sprite: o jogo escreve o nome
por conta própria, em fonte de verdade, e o jogador pode desligá-lo nos ajustes.

Por isso o recorte é por FAIXA: só a metade de cima da fileira, onde está a medalha, e
depois o aparo no alfa. O texto fica de fora por construção, não por peneira.

Croma igual ao resto do projeto: mag = min(R,B) - G, limite 58, erosao de 1px.
"""
from PIL import Image, ImageFilter
import numpy as np
import os, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAI = os.path.join(RAIZ, 'assets/ui/hud')
LIMITE = 58


def mascara(im):
    a = np.asarray(im.convert('RGB')).astype(np.int16)
    mag = np.minimum(a[:, :, 0], a[:, :, 2]) - a[:, :, 1]
    m = Image.fromarray(np.where(mag > LIMITE, 0, 255).astype(np.uint8), 'L')
    return m.filter(ImageFilter.MinFilter(3))


def colunas(arr, folga=4, minimo=40):
    # `folga` pequena de propósito: as medalhas da folha ficam a 6px uma da outra, e uma
    # folga de 12 juntava as duas últimas numa peça só. `minimo` alto descarta a lasca
    # que sobra na borda do recorte.
    col = arr.sum(axis=0)
    cheio = col > 0
    faixas, ini = [], None
    for x, v in enumerate(cheio):
        if v and ini is None: ini = x
        elif not v and ini is not None:
            faixas.append((ini, x)); ini = None
    if ini is not None: faixas.append((ini, len(cheio)))
    juntas = []
    for f in faixas:
        if juntas and f[0] - juntas[-1][1] <= folga: juntas[-1] = (juntas[-1][0], f[1])
        else: juntas.append(f)
    return [f for f in juntas if f[1] - f[0] >= minimo]


def recortar(arq, nomes, topo, base, x0=0, x1=None, tam=128):
    """`topo`/`base` delimitam a faixa da MEDALHA, sem o rótulo escrito."""
    im = Image.open(arq).convert('RGB')
    x1 = x1 or im.size[0]
    faixa = im.crop((x0, topo, x1, base))
    m = mascara(faixa)
    rgba = faixa.convert('RGBA'); rgba.putalpha(m)
    arr = np.asarray(m) > 0
    grupos = colunas(arr)
    if len(grupos) != len(nomes):
        print('  AVISO: %d peças para %d nomes — confira.' % (len(grupos), len(nomes)))
    os.makedirs(SAI, exist_ok=True)
    for i, (a, b) in enumerate(grupos):
        if i >= len(nomes): break
        peca = rgba.crop((a, 0, b, rgba.size[1]))
        cx = peca.getchannel('A').getbbox()
        if cx: peca = peca.crop(cx)
        # quadrado, para o botão não deformar seja qual for a moldura
        lado = max(peca.size)
        quad = Image.new('RGBA', (lado, lado), (0, 0, 0, 0))
        quad.paste(peca, ((lado - peca.size[0]) // 2, (lado - peca.size[1]) // 2), peca)
        quad = quad.resize((tam, tam), Image.LANCZOS)
        p = os.path.join(SAI, nomes[i] + '.png')
        quad.save(p, optimize=True)
        print('    %-22s %sx%s' % (nomes[i] + '.png', tam, tam))


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(2)
    NOMES = ['bolsa', 'personagem', 'sintese', 'musica', 'fazenda', 'missoes', 'mapa']
    recortar(sys.argv[1], NOMES, topo=75, base=205, x0=560)
