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
# As três texturas "escuras" são mato denso visto de cima, não grama de chão: no mapa
# davam aspecto de mato fechado e o personagem sumia. A campo_3 é lisa e sem marcas
# (a campo_2 tem um caminho desenhado embutido) — escurecida, é a que lê como solo.
CLARA = 'assets/texturas/grama_campo_3.jpg'
ESCURA = 'assets/texturas/grama_escura_3.jpg'


# A folha nova veio em verde-limão (203,209,82) e os props vivem entre (49,76,48) e
# (121,142,57): lado a lado, o chão gritava. Reequilibro por multiplicação de canal, que
# preserva o desenho da textura e só reposiciona a cor.
# Medido na Vila Medieval que já está no jogo: a grama de lá vai de (138,163,65) nos
# claros a (56,90,32) nas sombras, com média perto de (100,130,45). Eu tinha calibrado
# pelo tom MAIS CLARO, e por isso o chão saía verde-limão ao lado dos props.
ALVO = (72, 98, 44)

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
    import sys
    LIMPO = '--limpo' in sys.argv     # sem estrada, sem praça, sem sombra: tela em branco
    cfg = json.load(open('assets/mundo/mundo.json'))
    BW, BH = cfg['bloco']['w'], cfg['bloco']['h']
    COLS, ROWS = cfg['cols'], cfg['rows']
    H = ROWS * BH

    # A textura é pixel art de 1024px: ladrilhada em tamanho natural, cada "pixel" dela
    # fica gigante no mapa e o chão parece grosseiro. Reduzida, o grão cai na escala do
    # personagem e a superfície fica lisa — mesmo tratamento que a laje precisou.
    def fina(im, div=3):
        return im.resize((im.width // div, im.height // div), Image.LANCZOS)

    clara = fina(equilibrar(Image.open(CLARA).convert('RGB')))
    escura = fina(equilibrar(Image.open(ESCURA).convert('RGB'), (52, 74, 36)))
    terra = Image.open('assets/texturas/terra_1.jpg').convert('RGB')

    # A estrada passa a ser TERRENO, pintada no chão, e não uma fila de peças. Peça de
    # caminho traz a própria borda de grama e emenda com a vizinha — era a origem dos
    # retângulos visíveis ao longo do caminho.
    # A textura de laje veio com pedras enormes: cada uma ficava do tamanho da fonte da
    # praça. Reduzo a peça para a pedra cair na escala do personagem — como a textura
    # fecha nas bordas, reduzir não reintroduz costura.
    laje = Image.open('assets/texturas/laje_1.jpg').convert('RGB')
    laje = laje.resize((laje.width // 4, laje.height // 4), Image.LANCZOS)

    ESTRADA_Y, ESTRADA_MEIA = 1180, 96
    topo = ruido_de_borda(COLS * BW, 11, 26, 190)
    base = ruido_de_borda(COLS * BW, 29, 26, 210)

    # A cidade tem chão próprio: calçamento de pedra na praça e nas ruas, com a mesma
    # beira irregular da estrada. Praça redonda em volta da fonte, ruas saindo dela.
    PRACA = (1500, 1180, 620)          # centro x, centro y, raio
    RUA_MEIA = 130
    borda_praca = ruido_de_borda(3000, 47, 34, 150)

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
            bloco = base_ch if LIMPO else Image.composite(sombra, base_ch, mask)

            # a faixa de terra, com as duas beiras titubeando
            if not LIMPO:
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

                # calçamento: praça redonda mais a rua larga que a atravessa
                if ox < 3400:
                    calc = tiled(laje, BW, BH, ox, oy)
                    mp = Image.new('L', (BW, BH), 0)
                    pm = mp.load()
                    cx, cy, rr = PRACA
                    for xl in range(BW):
                        xg = ox + xl
                        dx = xg - cx
                        raio_aqui = rr + borda_praca(abs(xg) % 3000)
                        if abs(dx) < raio_aqui:
                            # altura da praça naquele x: círculo achatado
                            meia = (1 - (dx / raio_aqui) ** 2) ** .5 * raio_aqui * .58
                            y0, y1 = cy - meia - oy, cy + meia - oy
                            for yl in range(max(0, int(y0)), min(BH, int(y1))):
                                pm[xl, yl] = 255
                        if xg < 3300:      # a rua principal segue para leste
                            y0 = ESTRADA_Y - RUA_MEIA + topo(xg) - oy
                            y1 = ESTRADA_Y + RUA_MEIA + base(xg) - oy
                            for yl in range(max(0, int(y0)), min(BH, int(y1))):
                                pm[xl, yl] = 255
                    bloco = Image.composite(calc, bloco, mp)
            caminho = f'{RAIZ}/{c}_{r}.jpg'
            bloco.save(caminho, quality=86)
            blocos[f'{c}_{r}'] = caminho
    cfg['blocos'] = blocos
    json.dump(cfg, open('assets/mundo/mundo.json', 'w'), indent=2, ensure_ascii=False)
    print(f'{len(blocos)} blocos gerados · {COLS*BW}x{H}')


if __name__ == '__main__':
    main()
