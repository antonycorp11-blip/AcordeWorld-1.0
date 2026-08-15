#!/usr/bin/env python3
"""Transforma uma folha CRUA do gerador numa grade limpa, pronta para o `casar_folhas_heroi`.

As folhas não voltam do gerador no formato que o motor lê. Elas vêm com:

  · fundo pintado — magenta numas levas, xadrez de transparência achatado noutras;
  · rótulos DENTRO da imagem ("FRENTE", "COSTAS", "1 2 3…"), que sobrevivem ao recorte;
  · espaçamento irregular — cada quadro num lugar, cada linha com uma folga diferente.

O `casar_folhas_heroi.py` corta a folha dividindo largura e altura em partes iguais. Numa
folha irregular isso corta o personagem ao meio. Então este passo vem antes: acha cada
quadro pelo conteúdo, joga fora o que não é personagem, e reescreve numa grade regular.

DUAS DECISÕES QUE VALEM EXPLICAR

1. O RÓTULO SAI POR TAMANHO, não por posição. "FRENTE" fica à esquerda da primeira linha,
   mas "PERFIL ESQUERDO" ocupa duas linhas de texto e desce mais. Descartar por coluna
   fixa quebraria na primeira folha com outro arranjo. Descartar o que é baixo demais para
   ser o personagem funciona em qualquer arranjo.

2. AS LINHAS SÃO NORMALIZADAS ENTRE SI, e os quadros dentro da linha não. Numa folha o
   gerador desenhou o personagem 213 px de frente e 164 de perfil — 23% de diferença que
   viraria o herói encolhendo ao virar de lado. Já a variação DENTRO de uma linha é o
   agachamento do golpe, que é animação de verdade e não se mexe.

Uso:
    python3 ferramentas/limpar_folha_crua.py <cruas/*.png> <destino/> --colunas 8
"""
from PIL import Image
import numpy as np
import sys, os

MARGEM = 6


def alfa_da_folha(im):
    """Descobre sozinho se o fundo é magenta ou xadrez, e devolve a máscara de tinta."""
    a = np.asarray(im.convert('RGB')).astype(np.int16)
    mag = np.minimum(a[:, :, 0], a[:, :, 2]) - a[:, :, 1]
    magenta = mag > 55
    # Xadrez de transparência achatado: cinza NEUTRO e claro, em dois tons alternados.
    # Neutro é o que separa do machado, que é cinza mas tem contorno e sombra coloridos.
    neutro = (np.abs(a[:, :, 0] - a[:, :, 1]) < 6) & (np.abs(a[:, :, 1] - a[:, :, 2]) < 6)
    xadrez = neutro & (a[:, :, 0] >= 238)
    if magenta.mean() > 0.35:
        return ~magenta, 'magenta'
    if xadrez.mean() > 0.35:
        return ~xadrez, 'xadrez'
    raise SystemExit('fundo não reconhecido: nem magenta nem xadrez')


def bandas(v, minimo):
    out, ini = [], None
    for i, x in enumerate(v):
        if x and ini is None: ini = i
        elif not x and ini is not None:
            if i - ini >= minimo: out.append((ini, i))
            ini = None
    if ini is not None: out.append((ini, len(v)))
    return out


def e_rotulo(rec):
    """True se o recorte é TEXTO, não personagem.

    Filtrar só por altura não bastou: "PERFIL ESQUERDO" ocupa duas linhas e passa do
    limite de altura em folhas de célula baixa, e aí a palavra entra na grade como se
    fosse um quadro de animação.

    Texto de rótulo é branco puro — sem matiz nenhum. O personagem tem couro, pano e
    metal, todos coloridos. Medir a saturação separa os dois sem depender de onde o
    rótulo foi parar.
    """
    a = np.asarray(rec.convert('RGB')).astype(np.int16)
    alfa = np.asarray(rec.getchannel('A')) > 8
    if alfa.mean() < 0.06: return True                 # rabisco solto
    px = a[alfa]
    if not len(px): return True
    mx, mn = px.max(axis=1), px.min(axis=1)
    satur = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    return satur.mean() < 0.10


def figuras_por_linha(tinta, rgba, colunas):
    """Devolve fileiras[4] com os recortes de cada quadro. Dois caminhos, nesta ordem.

    O PRIMEIRO é ler as quatro faixas horizontais da folha. Funciona na maioria e é o que
    lida bem com o rótulo de texto ao lado da figura, que fica na mesma faixa e sai por
    ser baixo demais.

    O SEGUNDO entra quando o primeiro não acha quatro faixas. Isso acontece quando o
    desenho de uma linha invade a de cima — na folha do golpe vertical o machado erguido
    sobe para dentro da faixa anterior e as duas viram uma banda só. Dentro de UMA coluna,
    porém, as quatro figuras continuam separadas: o que se sobrepõe é a arma da figura ao
    lado, não a de cima. Aí cada coluna é lida sozinha.

    Dividir a altura em quatro partes iguais foi tentado e não serve: corta o machado no
    meio e deixa a ponta solta na célula de cima, que aparece no jogo como lixo flutuando.
    """
    linhas = [b for b in bandas(tinta.sum(axis=1) > 4, 12) if b[1] - b[0] > 110]
    if len(linhas) == 4:
        fileiras = []
        for y0, y1 in linhas:
            faixa = tinta[y0:y1]
            pecas = []
            for x0, x1 in bandas(faixa.sum(axis=0) > 2, 8):
                rec = rgba.crop((x0, y0, x1, y1))
                bb = rec.getchannel('A').getbbox()
                if not bb: continue
                rec = rec.crop(bb)
                # Rótulo e número são baixos; o personagem ocupa a faixa quase toda.
                if rec.height < (y1 - y0) * 0.45: continue
                if e_rotulo(rec): continue
                pecas.append((x0, rec))      # o X vai junto: a ORDEM é a animação
            if len(pecas) > colunas:
                # A ORDEM DA ESQUERDA PARA A DIREITA É A ANIMAÇÃO, e quase se perdeu aqui.
                #
                # Sobrando recorte, os mais altos são escolhidos — um rótulo teimoso ou
                # uma faísca solta some assim. Mas a versão anterior devolvia a lista JÁ
                # ORDENADA POR ALTURA, e a folha saía com os quadros embaralhados: o
                # golpe tocava o impacto antes do bote, e a arma pulava de lado, de
                # tamanho e de cor entre um quadro e outro. Foi o que o dono viu no golpe
                # básico do Huans.
                #
                # Escolher por altura e depois REORDENAR por X mantém as duas coisas.
                pecas = sorted(sorted(pecas, key=lambda t: -t[1].height)[:colunas],
                               key=lambda t: t[0])
            fileiras.append([r for _, r in pecas])
        return fileiras, 'por faixa'

    grade = []
    for x0, x1 in bandas(tinta.sum(axis=0) > 2, 8):
        fatia = tinta[:, x0:x1]
        ls = [b for b in bandas(fatia.sum(axis=1) > 1, 20) if b[1] - b[0] > 60]
        pecas = []
        for y0, y1 in ls:
            rec = rgba.crop((x0, y0, x1, y1))
            bb = rec.getchannel('A').getbbox()
            if bb and not e_rotulo(rec.crop(bb)): pecas.append(rec.crop(bb))
        if len(pecas) == 4: grade.append(pecas)   # coluna incompleta é rótulo, não figura
    return [[c[li] for c in grade] for li in range(4)], 'por coluna'


def limpar(entrada, destino, colunas):
    im = Image.open(entrada).convert('RGB')
    tinta, tipo = alfa_da_folha(im)
    rgba = im.convert('RGBA')
    rgba.putalpha(Image.fromarray((tinta * 255).astype(np.uint8), 'L'))

    fileiras, modo = figuras_por_linha(tinta, rgba, colunas)
    achadas = min(len(f) for f in fileiras) if fileiras else 0
    if achadas < colunas:
        print(f'  AVISO {os.path.basename(entrada)}: {achadas} quadros por linha, '
              f'esperava {colunas} ({modo})')

    # Régua ENTRE linhas: a mediana da linha da frente manda. Dentro da linha nada é
    # tocado — ali a variação é o agachamento do golpe, que é animação de verdade.
    def mediana(ps):
        hs = sorted(p.height for p in ps)
        return hs[len(hs) // 2] if hs else 0
    alvo = mediana(fileiras[0]) if fileiras else 0
    for i, ps in enumerate(fileiras):
        m = mediana(ps)
        if not m or not alvo: continue
        k = alvo / m
        if abs(k - 1) < 0.04: continue
        print(f'    linha {i}: corpo {m} -> {alvo} (x{k:.3f})')
        fileiras[i] = [p.resize((max(1, round(p.width * k)),
                                 max(1, round(p.height * k))), Image.NEAREST) for p in ps]

    for i, ps in enumerate(fileiras):
        if not ps: continue
        while len(ps) < colunas: ps.append(ps[-1].copy())
        fileiras[i] = ps[:colunas]

    CW = max(p.width for ps in fileiras for p in ps) + MARGEM * 2
    CH = max(p.height for ps in fileiras for p in ps) + MARGEM * 2
    saida = Image.new('RGBA', (CW * colunas, CH * 4), (0, 0, 0, 0))
    for li, ps in enumerate(fileiras):
        for ci, p in enumerate(ps):
            x = ci * CW + (CW - p.width) // 2
            y = li * CH + (CH - MARGEM) - p.height     # pés na mesma linha
            saida.paste(p, (x, y), p)

    os.makedirs(os.path.dirname(destino) or '.', exist_ok=True)
    saida.save(destino)
    print(f'  {os.path.basename(destino):26} {saida.size}  célula {CW}x{CH}  '
          f'fundo {tipo}  {colunas}x4  ({modo})')


if __name__ == '__main__':
    if '--colunas' not in sys.argv:
        print(__doc__); sys.exit(2)
    n = int(sys.argv[sys.argv.index('--colunas') + 1])
    limpar(sys.argv[1], sys.argv[2], n)
