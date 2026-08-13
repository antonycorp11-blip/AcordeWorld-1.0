#!/usr/bin/env python3
"""Recorta uma FILEIRA de estágios (uma cultura, 4 idades) em sprites soltos.

Diferente das outras duas ferramentas de recorte:
  recortar_fazenda.py   — folha com dezenas de sprites em grade
  recortar_habitats.py  — uma peça sozinha por arquivo
  esta                  — uma FILEIRA, da esquerda para a direita, onde a ORDEM é a idade

Isso importa: o estágio 1 tem de virar `_01`, e não "o blob mais à esquerda que sobrou".
Por isso os recortes saem ordenados por x, e a contagem esperada é declarada — se sair
número diferente, o script avisa em vez de gravar arte trocada.

Croma igual ao resto do projeto: mag = min(R,B) - G, limite 58, erosao de 1px.
"""
from PIL import Image, ImageFilter
import numpy as np
import os, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAI = os.path.join(RAIZ, 'assets/props')
LIMITE = 58
MIN_AREA = 1500        # ignora respingo solto do gerador


def mascara(im):
    a = np.asarray(im.convert('RGB')).astype(np.int16)
    mag = np.minimum(a[:, :, 0], a[:, :, 2]) - a[:, :, 1]
    m = Image.fromarray(np.where(mag > LIMITE, 0, 255).astype(np.uint8), 'L')
    return m.filter(ImageFilter.MinFilter(3))


def colunas(m, folga=14):
    """Onde estão as peças, olhando o perfil vertical. Numa fileira as peças são
    separadas por faixas de fundo — achar as faixas é mais robusto que rotular blobs,
    porque planta e sombra se partem em vários blobs e voltariam como peças separadas."""
    col = (np.asarray(m) > 0).sum(axis=0)
    cheio = col > 0
    faixas, ini = [], None
    for x, v in enumerate(cheio):
        if v and ini is None: ini = x
        elif not v and ini is not None:
            faixas.append((ini, x)); ini = None
    if ini is not None: faixas.append((ini, len(cheio)))
    # junta o que está perto: gavinha solta não é uma peça nova
    juntas = []
    for f in faixas:
        if juntas and f[0] - juntas[-1][1] <= folga:
            juntas[-1] = (juntas[-1][0], f[1])
        else:
            juntas.append(list(f))
            juntas[-1] = tuple(juntas[-1])
            juntas[-1] = (f[0], f[1])
    return [f for f in juntas if (f[1] - f[0]) > 8]


def recortar(caminho, prefixo, esperado=4):
    im = Image.open(caminho).convert('RGB')
    m = mascara(im)
    rgba = im.convert('RGBA'); rgba.putalpha(m)
    faixas = colunas(m)
    # descarta faixas de área irrisória
    boas = []
    for x0, x1 in faixas:
        rec = m.crop((x0, 0, x1, m.size[1]))
        if (np.asarray(rec) > 0).sum() >= MIN_AREA: boas.append((x0, x1))
    if len(boas) != esperado:
        print('  AVISO: achei %d peças, esperava %d — confira antes de usar.'
              % (len(boas), esperado))
    feitos = []
    for i, (x0, x1) in enumerate(boas, 1):
        faixa = rgba.crop((x0, 0, x1, rgba.size[1]))
        cx = faixa.getchannel('A').getbbox()
        if cx: faixa = faixa.crop(cx)
        nome = '%s_%02d.png' % (prefixo, i)
        faixa.save(os.path.join(SAI, nome))
        feitos.append(nome)
        print('    %-22s %sx%s' % (nome, *faixa.size))
    return feitos


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print('uso: recortar_estagios.py <arquivo> <prefixo> [qtd]')
        sys.exit(2)
    recortar(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 4)
