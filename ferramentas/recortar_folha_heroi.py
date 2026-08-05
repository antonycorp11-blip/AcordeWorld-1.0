#!/usr/bin/env python3
"""
Recorta uma folha de sprites do herói gerada com fundo magenta e a normaliza.

Fundo magenta em vez de branco resolve o problema que nos perseguia: branco existe no
personagem (brilho de metal, olho, dente) e existe no fundo, então separar os dois era
adivinhação — sobrava sujeira presa entre as mechas do cabelo. Magenta puro não existe
em lugar nenhum da arte, então a separação é exata, inclusive em vão fechado.

Três problemas que a folha crua sempre traz, e o que este script faz com cada um:

1. O fundo não é chapado. O gerador devolve (243,3,245), (244,4,246)... com ruído de
   compressão. Por isso a chave é por DISTÂNCIA de cor, não por igualdade.

2. A borda tem franja arroxeada: pixels que são mistura do personagem com o fundo,
   criados pela suavização do gerador. Deixá-los é ver um contorno roxo no jogo. O
   anel externo que encosta no fundo é removido, e a cor por baixo da transparência é
   preenchida com a média dos vizinhos opacos — sem isso a interpolação do navegador
   puxa cor de pixel vazio e devolve halo.

3. Os quadros não vêm alinhados. Cada célula é recortada pelo CONTEÚDO e reposicionada
   com os pés numa linha de base comum. Sem isso o personagem sobe e desce sozinho
   entre um quadro e outro, e a caminhada fica bêbada.
"""
import sys
from pathlib import Path
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent

# Distância a partir da qual a cor deixa de ser fundo. O ruído do gerador fica em ~5;
# 60 dá folga de sobra sem alcançar a cor de nenhuma peça do personagem.
TOL_FUNDO = 60
MARGEM = 6          # respiro em volta do maior quadro, para o contorno não encostar


def magentice(p):
    """Quanto este pixel puxa para o magenta: R e B altos com G baixo."""
    r, g, b = p[:3]
    return min(r, b) - g


def separar_fundo(im, cor_fundo):
    """Alfa binário. Pixel art não quer meio-tom: ou o pixel é do personagem ou não é."""
    im = im.convert('RGBA')
    larg, alt = im.size
    dados = list(im.getdata())
    fr, fg, fb = cor_fundo[:3]
    limite_magenta = magentice(cor_fundo) * 0.55

    saida = []
    for p in dados:
        r, g, b = p[0], p[1], p[2]
        dist = abs(r - fr) + abs(g - fg) + abs(b - fb)
        # Duas provas: perto da cor do fundo OU puxando fortemente para o magenta.
        # A segunda pega a franja, que está longe do magenta puro mas é magenta demais
        # para ser couro, metal ou pele.
        eh_fundo = dist < TOL_FUNDO or magentice(p) > limite_magenta
        saida.append((r, g, b, 0) if eh_fundo else (r, g, b, 255))
    nova = Image.new('RGBA', (larg, alt))
    nova.putdata(saida)
    return nova


def limpar_franja(im, passadas=1):
    """Apaga o anel de pixels opacos que encosta no fundo. Só o anel: erodir demais
    come o contorno escuro, que é o que dá a leitura de pixel art."""
    larg, alt = im.size
    for _ in range(passadas):
        px = im.load()
        remover = []
        for y in range(alt):
            for x in range(larg):
                if px[x, y][3] == 0:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    vx, vy = x + dx, y + dy
                    if not (0 <= vx < larg and 0 <= vy < alt) or px[vx, vy][3] == 0:
                        remover.append((x, y))
                        break
        for x, y in remover:
            r, g, b, _ = px[x, y]
            px[x, y] = (r, g, b, 0)
    return im


def sangrar_cor(im):
    """Preenche a cor por baixo dos pixels transparentes com a média dos vizinhos
    opacos. O alfa continua zero — isto é só para a interpolação do navegador não
    puxar cor de pixel vazio e desenhar um halo em volta do sprite."""
    larg, alt = im.size
    px = im.load()
    for _ in range(2):
        mudancas = []
        for y in range(alt):
            for x in range(larg):
                if px[x, y][3] != 0:
                    continue
                sr = sg = sb = n = 0
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        vx, vy = x + dx, y + dy
                        if 0 <= vx < larg and 0 <= vy < alt and px[vx, vy][3] != 0:
                            sr += px[vx, vy][0]; sg += px[vx, vy][1]; sb += px[vx, vy][2]
                            n += 1
                if n:
                    mudancas.append((x, y, (sr // n, sg // n, sb // n, 0)))
        for x, y, c in mudancas:
            px[x, y] = c
    return im


def curar_pontos_de_fundo(im, limite=60):
    """Apaga pontos de magenta presos DENTRO do personagem. Eles sobrevivem à chave por
    estarem cercados de sprite — vãos entre mechas de cabelo, frestas do cinto. Como
    ficam no meio da arte, não podem virar buraco: recebem a média dos vizinhos que não
    são magenta, o que os faz sumir sem abrir furo no desenho."""
    larg, alt = im.size
    px = im.load()
    presos = [(x, y) for y in range(alt) for x in range(larg)
              if px[x, y][3] != 0 and magentice(px[x, y]) > limite]
    for _ in range(3):
        restantes = []
        for x, y in presos:
            sr = sg = sb = n = 0
            for dx in (-2, -1, 0, 1, 2):
                for dy in (-2, -1, 0, 1, 2):
                    vx, vy = x + dx, y + dy
                    if 0 <= vx < larg and 0 <= vy < alt:
                        v = px[vx, vy]
                        if v[3] != 0 and magentice(v) <= limite:
                            sr += v[0]; sg += v[1]; sb += v[2]; n += 1
            if n:
                px[x, y] = (sr // n, sg // n, sb // n, 255)
            else:
                restantes.append((x, y))
        presos = restantes
        if not presos:
            break
    return im, len(presos)


def vales(perfil, n):
    """Onde cortar uma grade de `n` células. Procura o mínimo de densidade numa janela
    em volta de cada divisa teórica: o corte cai onde há menos desenho, que é a fresta
    entre dois quadros, mesmo quando ela não está completamente vazia."""
    total = len(perfil)
    passo = total / n
    cortes = [0]
    janela = int(passo * 0.22)          # ±22% da célula: folga para a divisa torta
    for i in range(1, n):
        centro = int(i * passo)
        ini = max(cortes[-1] + 1, centro - janela)
        fim = min(total - 1, centro + janela)
        melhor = min(range(ini, fim + 1), key=lambda x: (perfil[x], abs(x - centro)))
        cortes.append(melhor)
    cortes.append(total)
    return cortes


def bandas(vazias, tamanho):
    """Dos corredores de fundo saem os limites das células: o meio de cada corredor é
    um corte. Detectar assim é mais confiável que dividir por 8, porque o gerador
    raramente entrega células exatamente iguais."""
    grupos, atual = [], [vazias[0]] if vazias else []
    for i in range(1, len(vazias)):
        if vazias[i] == vazias[i - 1] + 1:
            atual.append(vazias[i])
        else:
            grupos.append(atual); atual = [vazias[i]]
    if atual:
        grupos.append(atual)
    cortes = [sum(g) // len(g) for g in grupos]
    if not cortes or cortes[0] > tamanho * 0.1:
        cortes.insert(0, 0)
    if cortes[-1] < tamanho * 0.9:
        cortes.append(tamanho - 1)
    return cortes


def processar(entrada, saida, cols=None, linhas=None):
    im = Image.open(entrada).convert('RGBA')
    larg, alt = im.size

    # A cor de fundo é simplesmente a mais comum da imagem.
    contagem = {}
    for p in im.convert('RGB').getdata():
        contagem[p] = contagem.get(p, 0) + 1
    cor_fundo = max(contagem, key=contagem.get)
    print(f'fundo detectado: {cor_fundo}')

    rec = separar_fundo(im, cor_fundo)
    rec = limpar_franja(rec)
    px = rec.load()

    # Perfil de densidade: quantos pixels opacos há em cada coluna e em cada linha.
    perfil_x = [sum(1 for y in range(alt) if px[x, y][3]) for x in range(larg)]
    perfil_y = [sum(1 for x in range(larg) if px[x, y][3]) for y in range(alt)]

    if cols and linhas:
        # Com a grade conhecida, o corte é o VALE de densidade perto de cada divisa
        # teórica. Exigir corredor totalmente vazio falhava na folha de ataque, onde o
        # rastro da espada atravessa a divisa e liga uma célula à seguinte — a grade era
        # lida como 4 colunas em vez de 6, e a divisão regular que entrava no lugar
        # cortava as cabeças.
        cortes_x = vales(perfil_x, cols)
        cortes_y = vales(perfil_y, linhas)
        nc, nl = cols, linhas
        print(f'grade: {nc} colunas x {nl} linhas (cortes pelo vale de densidade)')
    else:
        vazio_col = [x for x in range(larg) if perfil_x[x] == 0]
        vazio_lin = [y for y in range(alt) if perfil_y[y] == 0]
        cortes_x = bandas(vazio_col, larg)
        cortes_y = bandas(vazio_lin, alt)
        nc, nl = len(cortes_x) - 1, len(cortes_y) - 1
        print(f'grade detectada: {nc} colunas x {nl} linhas')

    # Recorta cada célula pelo conteúdo.
    quadros = []
    for li in range(nl):
        for ci in range(nc):
            cel = rec.crop((cortes_x[ci], cortes_y[li], cortes_x[ci + 1], cortes_y[li + 1]))
            bb = cel.getbbox()
            quadros.append((ci, li, cel.crop(bb) if bb else None))

    cheios = [q[2] for q in quadros if q[2]]
    if not cheios:
        print('nenhum quadro com conteúdo'); return
    maxw = max(q.width for q in cheios)
    maxh = max(q.height for q in cheios)
    CW, CH = maxw + MARGEM * 2, maxh + MARGEM * 2

    folha = Image.new('RGBA', (CW * nc, CH * nl), (0, 0, 0, 0))
    for ci, li, q in quadros:
        if not q:
            continue
        x = ci * CW + (CW - q.width) // 2                 # centrado na horizontal
        y = li * CH + (CH - MARGEM) - q.height            # pés na mesma linha de base
        folha.paste(q, (x, y), q)

    folha, teimosos = curar_pontos_de_fundo(folha)
    if teimosos:
        print(f'  {teimosos} ponto(s) de fundo sem vizinho limpo — verifique à mão')
    folha = sangrar_cor(folha)
    Path(saida).parent.mkdir(parents=True, exist_ok=True)
    folha.save(saida)

    opacos = sum(1 for p in folha.getdata() if p[3] > 0)
    print(f'\n{saida}')
    print(f'  {folha.width}x{folha.height} · células de {CW}x{CH} · {nc} cols x {nl} linhas')
    print(f'  {opacos} pixels opacos, nenhum semi-transparente (alfa binário)')


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print('uso: recortar_folha_heroi.py <entrada.png> <saida.png> [colunas] [linhas]')
        sys.exit(1)
    cols = int(sys.argv[3]) if len(sys.argv) > 3 else None
    lins = int(sys.argv[4]) if len(sys.argv) > 4 else None
    processar(sys.argv[1], sys.argv[2], cols, lins)
