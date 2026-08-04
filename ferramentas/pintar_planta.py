#!/usr/bin/env python3
"""
Pinta o chão da planta de Acordelot na camada de pintura do mundo.

Os tiles de piso resolvem a rua, que é dura e tem meio-fio. O que eles não resolvem é
o chão batido: a trilha de terra que sai do portão, o pátio do castelo, o largo da
feira. Isso não é peça, é mancha — então vai na mesma camada que o pincel do editor
usa, com o mesmo formato (um PNG RGBA por bloco de 1024x571), e o jogo carrega sem
saber que veio daqui.

A borda de toda mancha é irregular de propósito. Terra batida com contorno reto lê
como tapete; o que faz ler como chão é a franja onde ela se desmancha na grama.
"""
import json, math, random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

RAIZ = Path(__file__).resolve().parent.parent
random.seed(20260803)

BW, BH = 1024, 571
PLANTA = json.loads(Path('/tmp/planta_cidade.json').read_text())
CEL, X0, Y0 = PLANTA['cel'], PLANTA['x0'], PLANTA['y0']

mundo = json.loads((RAIZ / 'assets/mundo/mundo.json').read_text())
COLS_B, LINS_B = mundo['cols'], mundo['rows']

# ── Texturas ────────────────────────────────────────────────────────────────────
# `div` é o mesmo do editor: a foto é grande demais para o grão do jogo e precisa
# encolher, senão o chão vira paisagem em vez de textura.
def textura(arquivo, div):
    im = Image.open(RAIZ / arquivo).convert('RGB')
    return im.resize((max(1, im.width // div), max(1, im.height // div)), Image.LANCZOS)

TERRA = textura('assets/texturas/terra_1.jpg', 2)
LAJE = textura('assets/texturas/laje_1.jpg', 4)
AREIA = textura('assets/texturas/areia_1.jpg', 2)


def ladrilhar(tex, w, h, ox=0, oy=0):
    """Repete a textura cobrindo w x h, com deslocamento para blocos vizinhos
    continuarem o mesmo desenho em vez de reiniciarem na emenda."""
    out = Image.new('RGB', (w, h))
    for y in range(-(oy % tex.height), h, tex.height):
        for x in range(-(ox % tex.width), w, tex.width):
            out.paste(tex, (x, y))
    return out


# ── Máscaras, em coordenadas do mundo inteiro ───────────────────────────────────
# Uma máscara por material, no tamanho do mundo dividido por REDUZ. Desenhar em
# resolução cheia (10240x5710 por material) custa memória à toa: a borda é borrada
# de qualquer jeito, então a máscara pode ser grosseira e crescer na hora de aplicar.
REDUZ = 4
MW, MH = COLS_B * BW // REDUZ, LINS_B * BH // REDUZ

mascaras = {'terra': Image.new('L', (MW, MH), 0),
            'laje': Image.new('L', (MW, MH), 0),
            'areia': Image.new('L', (MW, MH), 0)}
lapis = {k: ImageDraw.Draw(v) for k, v in mascaras.items()}


def m(v): return v / REDUZ


def borrao(mat, x, y, raio, forca=255):
    """Mancha redonda com o raio sacudido, para o contorno não sair de compasso."""
    r = raio * random.uniform(0.78, 1.22)
    lapis[mat].ellipse([m(x - r), m(y - r), m(x + r), m(y + r)], fill=forca)


def caminho(mat, pontos, raio):
    """Trilha: bolas sobrepostas ao longo dos pontos. Sobreposição alta porque o que
    denuncia trilha falsa é o serrilhado entre uma bola e a próxima."""
    for i in range(len(pontos) - 1):
        (x1, y1), (x2, y2) = pontos[i], pontos[i + 1]
        d = math.hypot(x2 - x1, y2 - y1)
        passos = max(2, int(d / (raio * 0.35)))
        for s in range(passos + 1):
            t = s / passos
            borrao(mat, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, raio)


def centro(c, l): return (X0 + c * CEL + CEL / 2, Y0 + l * CEL + CEL / 2)


def retangulo(mat, c, l, w, h, margem=0.35):
    """Terreno grande. O miolo é sólido; a franja sai de bolas na borda, para o
    pátio não terminar num corte de tesoura."""
    x0, y0 = X0 + c * CEL, Y0 + l * CEL
    x1, y1 = x0 + w * CEL, y0 + h * CEL
    g = CEL * margem
    lapis[mat].rectangle([m(x0 - g), m(y0 - g), m(x1 + g), m(y1 + g)], fill=255)
    passo = CEL * 0.5
    for x in [x0 + i * passo for i in range(int((x1 - x0) / passo) + 1)] + [x1]:
        borrao(mat, x, y0 - g, CEL * 0.42)
        borrao(mat, x, y1 + g, CEL * 0.42)
    for y in [y0 + i * passo for i in range(int((y1 - y0) / passo) + 1)] + [y1]:
        borrao(mat, x0 - g, y, CEL * 0.42)
        borrao(mat, x1 + g, y, CEL * 0.42)


# ── 1. Terrenos reservados ──────────────────────────────────────────────────────
# Castelo e templo em laje: pátio construído, de quem tinha dinheiro para calçar.
# Feira em terra batida: pisada de gente e carroça, ninguém calça um largo de feira.
retangulo('laje', *PLANTA['castelo'])
retangulo('laje', *PLANTA['templo'])
retangulo('terra', *PLANTA['feira'])

# ── 2. Praças ───────────────────────────────────────────────────────────────────
pc, pl, praio = PLANTA['praca_r']
x, y = centro(pc, pl)
r = praio * CEL
for a in range(0, 360, 7):
    rad = math.radians(a)
    borrao('laje', x + math.cos(rad) * r, y + math.sin(rad) * r, CEL * 0.4)
lapis['laje'].ellipse([m(x - r), m(y - r), m(x + r), m(y + r)], fill=255)

qc, ql, qw, qh = PLANTA['praca_q']
retangulo('laje', qc, ql, qw, qh, margem=0.2)

# ── 3. Trilhas de terra saindo dos portões ──────────────────────────────────────
# Elas não são decoração: são o convite para sair da cidade. Terminam largas e vão
# afinando, que é como caminho de pé feito some no mato.
for traco in PLANTA.get('trilhas', []):
    pontos = [centro(c, l) for (c, l) in traco]
    # afina do portão para fora: perto da cidade a trilha é larga de tanto pé,
    # longe dela some no mato
    for i in range(len(pontos) - 1):
        t = i / max(1, len(pontos) - 2)
        caminho('terra', pontos[i:i + 2], CEL * (0.44 - 0.26 * t))

# ── 4. Praia: a areia encosta no mar, do lado direito do mundo ──────────────────
# O mundo já tem mar à direita; a faixa de areia acompanha a costa com a borda
# sacudida, senão vira piscina.
COSTA = COLS_B * BW - 1500
for y in range(0, LINS_B * BH, 90):
    onda = math.sin(y / 640.0) * 260 + math.sin(y / 197.0) * 90
    caminho('areia', [(COSTA + onda, y), (COSTA + onda + 900, y + 90)], 220)

# ── 5. Aplicar bloco a bloco ────────────────────────────────────────────────────
saida = RAIZ / 'assets/mundo/pintura'
saida.mkdir(parents=True, exist_ok=True)
for f in saida.glob('*.png'):
    f.unlink()

TEX = {'terra': TERRA, 'laje': LAJE, 'areia': AREIA}
escritos = 0
for r_ in range(LINS_B):
    for c_ in range(COLS_B):
        cx, cy = c_ * BW, r_ * BH
        bloco = Image.new('RGBA', (BW, BH), (0, 0, 0, 0))
        usou = False
        for mat in ('areia', 'terra', 'laje'):   # laje por último: pátio cobre trilha
            recorte = mascaras[mat].crop((cx // REDUZ, cy // REDUZ,
                                          cx // REDUZ + BW // REDUZ,
                                          cy // REDUZ + BH // REDUZ))
            if not recorte.getbbox():
                continue
            alpha = recorte.resize((BW, BH), Image.BILINEAR).filter(
                ImageFilter.GaussianBlur(9))
            if not alpha.getbbox():
                continue
            pintura = ladrilhar(TEX[mat], BW, BH, cx, cy)
            bloco.alpha_composite(Image.merge('RGBA', (*pintura.split(), alpha)))
            usou = True
        if usou:
            bloco.save(saida / f'{c_}_{r_}.png')
            escritos += 1

print(f'{escritos} blocos pintados em assets/mundo/pintura')
