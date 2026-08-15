#!/usr/bin/env python3
"""Troca a cor do cabelo numa folha de sprite, sem tocar no resto.

POR QUE ISTO EXISTE. As sete folhas do Huans vieram em duas levas, e a segunda saiu com
o cabelo preto em vez de castanho. No jogo isso aparece na hora: o herói anda de cabelo
castanho e, no instante em que ataca, fica moreno — em TODO golpe. Regerar quatro folhas
por causa da cor é caro; trocar a cor é barato, se for feito com medida.

COMO A MÁSCARA É FEITA, e por que não é por cor sozinha. Cabelo preto e calça preta têm
a mesma cor: um filtro só de cor levaria a roupa junto. Então a máscara é a INTERSEÇÃO de
duas coisas:

  1. GEOMETRIA — só o alto de cada figura. Cada quadro é isolado, mede-se a caixa dele, e
     apenas a fatia de cima entra. É o que exclui calça, bota e capa.
  2. COR — dentro dessa fatia, só o que é escuro e pouco saturado. É o que exclui a pele
     (clara e saturada), a gola de pelo (clara) e o vermelho do casaco (muito saturado).

A troca preserva o BRILHO relativo de cada pixel, com um ganho medido. Pintar o cabelo de
uma cor chapada apagaria o sombreado que o desenhista pôs — o cabelo viraria um borrão.

Uso:
    python3 ferramentas/recolorir_cabelo.py <entrada.png> <saida.png> [--prova prova.png]
"""
from PIL import Image
import numpy as np
import sys, os

LIMITE_MAGENTA = 55

# Medido nas folhas 1 e 2, que são a referência do personagem: matiz 19°, saturação 88%,
# brilho mediano 33%. O preto a corrigir tem matiz 43°, saturação 35%, brilho 17% — daí o
# ganho de brilho de ~1.95 aplicado abaixo.
MATIZ_ALVO   = 19.3 / 360
SATUR_ALVO   = 0.88
GANHO_BRILHO = 1.95

# A fatia de cima de cada figura que conta como cabeça. 0.30 é generoso para o cabelo
# espetado e ainda para bem acima do cinto.
FATIA_DA_CABECA = 0.30


def bandas(v, minimo):
    out, ini = [], None
    for i, x in enumerate(v):
        if x and ini is None: ini = i
        elif not x and ini is not None:
            if i - ini >= minimo: out.append((ini, i))
            ini = None
    if ini is not None: out.append((ini, len(v)))
    return out


def rgb_para_hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1)
    d = mx - mn
    h = np.zeros_like(mx)
    m = d > 1e-6
    idx = m & (mx == r); h[idx] = ((g - b)[idx] / d[idx]) % 6
    idx = m & (mx == g); h[idx] = ((b - r)[idx] / d[idx]) + 2
    idx = m & (mx == b); h[idx] = ((r - g)[idx] / d[idx]) + 4
    h /= 6
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0)
    return h, s, mx


def hsv_para_rgb(h, s, v):
    i = np.floor(h * 6).astype(int) % 6
    f = h * 6 - np.floor(h * 6)
    p, q, t = v * (1 - s), v * (1 - f * s), v * (1 - (1 - f) * s)
    out = np.zeros(h.shape + (3,), dtype=np.float32)
    for k, (rr, gg, bb) in enumerate([(v,t,p),(q,v,p),(p,v,t),(p,q,v),(t,p,v),(v,p,q)]):
        m = i == k
        out[m] = np.stack([rr, gg, bb], -1)[m]
    return out


def mascara_do_cabelo(im):
    """True onde é cabelo. Geometria por quadro, cor dentro dela."""
    arr = np.asarray(im).astype(np.int16)
    tinta = (np.minimum(arr[:, :, 0], arr[:, :, 2]) - arr[:, :, 1]) <= LIMITE_MAGENTA
    f = np.asarray(im).astype(np.float32) / 255
    h, s, v = rgb_para_hsv(f)

    cabeca = np.zeros(tinta.shape, bool)
    for y0, y1 in [b for b in bandas(tinta.sum(axis=1) > 4, 12) if b[1] - b[0] > 110]:
        faixa = tinta[y0:y1]
        for x0, x1 in [c for c in bandas(faixa.sum(axis=0) > 2, 8) if c[1] - c[0] > 40]:
            ys = np.where(faixa[:, x0:x1].any(axis=1))[0]
            if not len(ys): continue
            topo, alt = y0 + ys[0], ys[-1] - ys[0]
            cabeca[topo:topo + int(alt * FATIA_DA_CABECA), x0:x1] = True

    # Escuro e pouco saturado: cabelo. A pele é clara, a gola é clara, o casaco é
    # saturado, e o contorno preto puro (v <= 0.06) fica de fora para a silhueta não
    # mudar de cor.
    return tinta & cabeca & (s < 0.55) & (v > 0.06) & (v < 0.50)


def recolorir(entrada, saida, prova=None):
    im = Image.open(entrada).convert('RGB')
    m = mascara_do_cabelo(im)
    f = np.asarray(im).astype(np.float32) / 255
    h, s, v = rgb_para_hsv(f)

    h2, s2, v2 = h.copy(), s.copy(), v.copy()
    h2[m] = MATIZ_ALVO
    s2[m] = SATUR_ALVO
    v2[m] = np.clip(v[m] * GANHO_BRILHO, 0, 0.62)   # teto: cabelo não vira loiro

    novo = np.asarray(im).astype(np.float32) / 255
    conv = hsv_para_rgb(h2, s2, v2)
    novo[m] = conv[m]
    saida_im = Image.fromarray((novo * 255).round().astype(np.uint8), 'RGB')
    saida_im.save(saida)
    print('  %-28s %6d px de cabelo trocados' % (os.path.basename(saida), int(m.sum())))

    if prova:
        # Antes | máscara em verde | depois — lado a lado, para conferir com o olho antes
        # de aplicar em folha nenhuma. Máscara errada estraga o sprite em silêncio.
        marca = np.asarray(im).copy()
        marca[m] = [0, 255, 0]
        tira = [im, Image.fromarray(marca, 'RGB'), saida_im]
        W = sum(t.width for t in tira) + 20 * len(tira)
        tela = Image.new('RGB', (W, im.height), (18, 18, 26))
        x = 10
        for t in tira:
            tela.paste(t, (x, 0)); x += t.width + 20
        tela.save(prova)
        print('  prova ->', prova)


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(__doc__); sys.exit(2)
    p = sys.argv[sys.argv.index('--prova') + 1] if '--prova' in sys.argv else None
    recolorir(sys.argv[1], sys.argv[2], p)
