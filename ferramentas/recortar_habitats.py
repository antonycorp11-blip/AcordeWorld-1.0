#!/usr/bin/env python3
"""Recorta os habitats dos Ecos — um por nota, uma imagem por arquivo.

Diferente do `recortar_fazenda.py`, que fatia uma FOLHA cheia de sprites: aqui cada
arquivo de entrada ja e um habitat sozinho sobre magenta. Entao nao ha segmentacao em
blobs nem peneira de rotulo — so o recorte de croma e o aparo na caixa do objeto.

O metodo do croma e o mesmo do resto do projeto, de proposito:
    mag = min(R,B) - G,  limite 58,  erosao de 1px (MinFilter 3) para matar a franja roxa.

Uso:
    python3 ferramentas/recortar_habitats.py <pasta_ou_arquivos...>

O mapa NOTA -> arquivo esta em MAPA, casado com a personalidade que cada Eco ja tem
declarada em monsters.json (o Fa e agua serena, o Mi e luz, o Si e penumbra...).
"""
from PIL import Image, ImageFilter
import numpy as np
import os, sys, json

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAI = os.path.join(RAIZ, 'assets/props')
LIMITE = 58

# md5 do arquivo enviado -> nota. Casa pelo CONTEUDO e nao pelo nome, porque os anexos
# chegam com nome aleatorio e o mesmo habitat pode ser reenviado com outro nome.
MAPA = {
    '3a3f0105': 'do',    # campina suave, lago, flores pastel — pureza, novos comecos
    '382bbda3': 're',    # clareira de grama, monolitos, placa — curioso, crescimento
    '758be8db': 'mi',    # cristais amarelos, sois entalhados — radiante, luz que aquece
    '29b7c833': 'fa',    # anel de pedra, cascata, agua azul — livre e sereno
    '354e503a': 'sol',   # praca dourada, cristais prismaticos — profundo e sabio
    '200ab9b0': 'la',    # bosque lilas, cristais, ouro — doce e sonhador
    'a26fe302': 'si',    # musgo, cogumelos, clave na pedra — esperto e misterioso
}

NOME_DA_NOTA = {'do': 'Dó', 're': 'Ré', 'mi': 'Mi', 'fa': 'Fá',
                'sol': 'Sol', 'la': 'Lá', 'si': 'Si'}


def recortar(caminho):
    im = Image.open(caminho).convert('RGB')
    a = np.asarray(im).astype(np.int16)
    # mag = min(R,B) - G. Acima do limite e fundo magenta.
    mag = np.minimum(a[:, :, 0], a[:, :, 2]) - a[:, :, 1]
    m = Image.fromarray(np.where(mag > LIMITE, 0, 255).astype(np.uint8), 'L')
    m = m.filter(ImageFilter.MinFilter(3))       # erosao: come a franja roxa
    rgba = im.convert('RGBA')
    rgba.putalpha(m)
    caixa = m.getbbox()
    return rgba.crop(caixa) if caixa else rgba


def main(entradas):
    arquivos = []
    for e in entradas:
        if os.path.isdir(e):
            arquivos += [os.path.join(e, f) for f in sorted(os.listdir(e))
                         if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        else:
            arquivos.append(e)

    feitos = {}
    for f in arquivos:
        chave = os.path.basename(f).split('-')[0]
        nota = MAPA.get(chave)
        if not nota:
            print('  (pulado, sem nota no mapa)', os.path.basename(f)[:40])
            continue
        if nota in feitos:
            continue                             # reenvio do mesmo habitat
        spr = recortar(f)
        nome = 'faz_hab_%s.png' % nota
        spr.save(os.path.join(SAI, nome))
        feitos[nota] = {'arquivo': nome, 'w': spr.size[0], 'h': spr.size[1]}
        print('  %-4s -> %-20s %sx%s' % (NOME_DA_NOTA[nota], nome, *spr.size))

    faltam = [n for n in NOME_DA_NOTA if n not in feitos]
    print('\n%d de 7 habitats recortados.' % len(feitos))
    if faltam:
        print('FALTAM:', ', '.join(NOME_DA_NOTA[n] for n in faltam))
    return feitos


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    main(sys.argv[1:])
