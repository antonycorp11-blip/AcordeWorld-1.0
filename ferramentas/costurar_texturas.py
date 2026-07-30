#!/usr/bin/env python3
"""
Faz uma textura fechar nas quatro bordas.

Gerador de imagem não entrega isso: medi as dezoito e só uma fechava. A costura é
mecânica e cabe aqui.

O método: desloco a imagem meia largura e meia altura (o que joga as bordas antigas
para o centro) e faço uma passagem suave da original para a deslocada conforme se
aproxima da borda. O resultado é que a beirada da imagem passa a mostrar o MIOLO da
original — e miolo é contínuo consigo mesmo. Assim a borda direita encontra a esquerda
sem degrau, sem precisar espelhar nada (espelho fecha, mas deixa simetria de borboleta
que aparece em textura grande).
"""
import glob, os, sys
from PIL import Image, ImageChops

BANDA = 0.22   # fração do lado onde a transição acontece


def rampa(n, banda):
    """Perfil 1D: 0 no centro, 1 nas pontas, com transição suave."""
    faixa = max(2, int(n * banda))
    linha = Image.new('L', (n, 1), 0)
    px = linha.load()
    for i in range(n):
        d = min(i, n - 1 - i)                  # distância até a borda mais próxima
        if d >= faixa:
            v = 0
        else:
            t = 1 - d / faixa                  # 0 no fim da faixa, 1 na borda
            v = int(255 * (t * t * (3 - 2 * t)))   # suavização (smoothstep)
        px[i, 0] = v
    return linha


def costurar(im):
    w, h = im.size
    deslocada = ImageChops.offset(im, w // 2, h // 2)
    mx = rampa(w, BANDA).resize((w, h), Image.NEAREST)
    my = rampa(h, BANDA).rotate(90, expand=True).resize((w, h), Image.NEAREST)
    mascara = ImageChops.lighter(mx, my)
    return Image.composite(deslocada, im, mascara)


def main():
    alvos = sys.argv[1:] or sorted(glob.glob('assets/texturas/*.jpg'))
    for caminho in alvos:
        im = Image.open(caminho).convert('RGB')
        costurar(im).save(caminho, quality=92)
        print('costurada:', os.path.basename(caminho))


if __name__ == '__main__':
    main()
