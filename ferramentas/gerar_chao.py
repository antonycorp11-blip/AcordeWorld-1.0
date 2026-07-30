#!/usr/bin/env python3
"""
Gera os blocos de chão do mundo a partir das texturas costuradas.

Duas decisões que fazem a diferença:

1. O ladrilho é alinhado às COORDENADAS DO MUNDO, não a cada bloco. Se cada bloco
   começasse a textura do zero, a emenda entre blocos apareceria mesmo com a textura
   fechando — o padrão reiniciaria a cada 1024 pixels de mundo.

2. O solo escurece sob a mata. Duas texturas (campo e sombra) misturadas por um degradê
   vertical: escuro nas faixas de floresta, claro na clareira do meio. Como as duas são
   contínuas e estão no mesmo alinhamento, a passagem de uma para a outra não tem
   costura — e o mapa ganha profundidade sem custar arte nova.
"""
import json
from PIL import Image, ImageChops

RAIZ = 'assets/mundo/chunks'
CLARA = 'assets/texturas/grama_campo_1.jpg'
ESCURA = 'assets/texturas/grama_escura_1.jpg'


# A folha nova veio em verde-limão (203,209,82) e os props vivem entre (49,76,48) e
# (121,142,57): lado a lado, o chão gritava. Reequilibro por multiplicação de canal, que
# preserva o desenho da textura e só reposiciona a cor.
ALVO = (138, 158, 70)

def equilibrar(im, alvo=ALVO):
    from PIL import ImageStat
    m = ImageStat.Stat(im).mean
    fatores = [min(1.6, alvo[i] / max(1, m[i])) for i in range(3)]
    return Image.merge('RGB', [c.point(lambda v, k=k: min(255, int(v * k)))
                               for c, k in zip(im.split(), fatores)])


def ruido_de_borda(largura, semente, amplitude, passo):
    """Perfil irregular para a beira da estrada. Estrada com borda reta é a coisa que
    mais denuncia mapa montado — o contorno tem que titubear."""
    import random
    rnd = random.Random(semente)
    pontos = [rnd.uniform(-amplitude, amplitude) for _ in range(largura // passo + 2)]
    def em(x):
        i = x / passo
        a, b = pontos[int(i)], pontos[int(i) + 1]
        t = i - int(i)
        return a + (b - a) * (t * t * (3 - 2 * t))
    return em


def tiled(textura, w, h, ox, oy):
    """Recorta uma janela do plano infinito ladrilhado com `textura`."""
    tw, th = textura.size
    fora = Image.new('RGB', (w + tw, h + th))
    for i in range((w + tw) // tw + 1):
        for j in range((h + th) // th + 1):
            fora.paste(textura, (i * tw, j * th))
    dx, dy = ox % tw, oy % th
    return fora.crop((dx, dy, dx + w, dy + h))


def gradiente(h, faixas):
    """Coluna de 1px: 255 onde a sombra manda, 0 onde o campo manda."""
    col = Image.new('L', (1, h), 0)
    px = col.load()
    for y in range(h):
        v = 0
        for (ini, fim, dentro) in faixas:
            if ini <= y < fim:
                v = max(v, dentro(y, ini, fim))
        px[0, y] = v
    return col


def main():
    cfg = json.load(open('assets/mundo/mundo.json'))
    BW, BH = cfg['bloco']['w'], cfg['bloco']['h']
    COLS, ROWS = cfg['cols'], cfg['rows']
    H = ROWS * BH

    clara = equilibrar(Image.open(CLARA).convert('RGB'))
    escura = equilibrar(Image.open(ESCURA).convert('RGB'), (96, 116, 56))
    terra = Image.open('assets/texturas/terra_1.jpg').convert('RGB')

    # A estrada passa a ser TERRENO, pintada no chão, e não uma fila de peças. Peça de
    # caminho traz a própria borda de grama e emenda com a vizinha — era a origem dos
    # retângulos visíveis ao longo do caminho.
    ESTRADA_Y, ESTRADA_MEIA = 1180, 96
    topo = ruido_de_borda(COLS * BW, 11, 26, 190)
    base = ruido_de_borda(COLS * BW, 29, 26, 210)

    # A mata ocupa os 380px de cima e de baixo; a transição leva mais 260px.
    MATA, PASSAGEM = 380, 260
    def perfil(y):
        if y < MATA: return 255
        if y < MATA + PASSAGEM:
            t = 1 - (y - MATA) / PASSAGEM
            return int(255 * (t * t * (3 - 2 * t)))
        if y > H - MATA: return 255
        if y > H - MATA - PASSAGEM:
            t = (y - (H - MATA - PASSAGEM)) / PASSAGEM
            return int(255 * (t * t * (3 - 2 * t)))
        return 0

    coluna = Image.new('L', (1, H))
    pc = coluna.load()
    for y in range(H): pc[0, y] = perfil(y)

    blocos = {}
    for c in range(COLS):
        for r in range(ROWS):
            ox, oy = c * BW, r * BH
            base_ch = tiled(clara, BW, BH, ox, oy)
            sombra = tiled(escura, BW, BH, ox, oy)
            mask = coluna.crop((0, oy, 1, oy + BH)).resize((BW, BH), Image.BILINEAR)
            bloco = Image.composite(sombra, base_ch, mask)

            # a faixa de terra, com as duas beiras titubeando
            chao_terra = tiled(terra, BW, BH, ox, oy)
            faixa = Image.new('L', (BW, BH), 0)
            pf = faixa.load()
            for xl in range(BW):
                xg = ox + xl
                y0 = ESTRADA_Y - ESTRADA_MEIA + topo(xg) - oy
                y1 = ESTRADA_Y + ESTRADA_MEIA + base(xg) - oy
                for yl in range(max(0, int(y0)), min(BH, int(y1))):
                    pf[xl, yl] = 255
            bloco = Image.composite(chao_terra, bloco, faixa)
            caminho = f'{RAIZ}/{c}_{r}.jpg'
            bloco.save(caminho, quality=86)
            blocos[f'{c}_{r}'] = caminho
    cfg['blocos'] = blocos
    json.dump(cfg, open('assets/mundo/mundo.json', 'w'), indent=2, ensure_ascii=False)
    print(f'{len(blocos)} blocos gerados · {COLS*BW}x{H}')


if __name__ == '__main__':
    main()
