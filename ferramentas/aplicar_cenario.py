#!/usr/bin/env python3
"""Leva o resultado de copiar_cenario.py para o mundo: blocos, pintura e objetos."""
import json, os
from pathlib import Path
from PIL import Image, ImageChops

RAIZ = Path(__file__).resolve().parent.parent
BW, BH = 1024, 571
TEX = {'terra': ('assets/texturas/terra_1.jpg', 2),
       'laje':  ('assets/texturas/laje_1.jpg', 4),
       'areia': ('assets/texturas/areia_1.jpg', 2),
       'mar':   ('assets/texturas/areia_2.jpg', 2)}   # o mar é tingido de azul abaixo


def tiled(tex, w, h, ox, oy):
    tw, th = tex.size
    fora = Image.new('RGB', (w + tw, h + th))
    for i in range((w + tw)//tw + 1):
        for j in range((h + th)//th + 1):
            fora.paste(tex, (i*tw, j*th))
    return fora.crop((ox % tw, oy % th, ox % tw + w, oy % th + h))


def main():
    props = json.loads(Path('/tmp/cenario_props.json').read_text())
    masc = {k: Image.open(f'/tmp/cenario_masc/{k}.png').convert('L') for k in ('terra', 'laje')}
    LARG, ALT = masc['terra'].size
    cols = -(-LARG // BW); rows = -(-ALT // BH)

    cfg = json.loads((RAIZ / 'assets/mundo/mundo.json').read_text())
    cfg['nome'] = 'Clareira dos Ecos'
    # O mundo é maior que o bosque de propósito: sobra terreno a oeste para Acordelot
    # crescer sem espremer a floresta.
    # O mundo cresce nos dois sentidos: para a direita entram a praia e o mar, e para
    # cima entra a cidade. O bosque não encolhe — ele só deixa de estar na borda.
    cols = max(cols + 4, 10)
    rows = rows + 2
    cfg['cols'], cfg['rows'] = cols, rows
    cfg['props'] = props
    cfg['spawn'] = {'x': LARG // 2, 'y': int(ALT * 0.62)}
    # blocos de chão: o gerador cuida deles, aqui só declaro os nomes
    cfg['blocos'] = {f'{c}_{r}': f'assets/mundo/chunks/{c}_{r}.jpg'
                     for c in range(cols) for r in range(rows)}
    (RAIZ / 'assets/mundo/mundo.json').write_text(json.dumps(cfg, indent=2, ensure_ascii=False),
                                                  encoding='utf-8')

    # pintura: uma imagem por bloco, com terra e laje nas posições do cenário original
    pasta = RAIZ / 'assets/mundo/pintura'
    for f in pasta.glob('*.png'): f.unlink()
    pasta.mkdir(parents=True, exist_ok=True)
    texturas = {}
    for k, (cam, div) in TEX.items():
        t = Image.open(RAIZ / cam).convert('RGB')
        texturas[k] = t.resize((t.width // div, t.height // div), Image.LANCZOS)

    # As máscaras do cenário também descem, junto com os objetos.
    DESCE = 1142
    for k in masc:
        nova = Image.new('L', (cols * BW, rows * BH), 0)
        nova.paste(masc[k], (0, DESCE))
        masc[k] = nova

    # ── Praia, mar e o chão da cidade ────────────────────────────────────────────
    LARGM, ALTM = cols * BW, rows * BH
    praia = Image.new('L', (LARGM, ALTM), 0)
    mar = Image.new('L', (LARGM, ALTM), 0)
    dp, dm = praia.load(), mar.load()
    import random
    random.seed(90210)
    # a linha da água ondula: praia com borda reta não engana ninguém
    ondas = [random.uniform(-70, 70) for _ in range(ALTM // 90 + 2)]
    def borda(y):
        i = y / 90.0
        a, b = ondas[int(i)], ondas[min(len(ondas)-1, int(i)+1)]
        t = i - int(i)
        return a + (b - a) * (t*t*(3-2*t))
    X_PRAIA = 4180
    for y in range(ALTM):
        xa = int(X_PRAIA + borda(y))
        for x in range(xa, min(LARGM, xa + 330)): dp[x, y] = 255
        for x in range(min(LARGM, xa + 300), LARGM): dm[x, y] = 255
    masc['areia'] = praia
    masc['mar'] = mar

    salvos = 0
    for c in range(cols):
        for r in range(rows):
            ox, oy = c * BW, r * BH
            camada = Image.new('RGBA', (BW, BH), (0, 0, 0, 0))
            usou = False
            for mat in ('areia', 'mar', 'terra', 'laje'):
                m = masc[mat].crop((ox, oy, ox + BW, oy + BH))
                if not m.getbbox(): continue
                usou = True
                chao = tiled(texturas[mat], BW, BH, ox, oy)
                if mat == 'mar':
                    # O mar sai da textura de areia tingida: dá o movimento de fundo de
                    # areia visto pela água, que é como praia rasa se lê de cima.
                    r_, g_, b_ = chao.split()
                    chao = Image.merge('RGB', [
                        r_.point(lambda v: int(v * .32)),
                        g_.point(lambda v: int(v * .62)),
                        b_.point(lambda v: min(255, int(v * .95 + 40)))])
                chao = chao.convert('RGBA')
                chao.putalpha(m)
                camada = Image.alpha_composite(camada, chao)
            if usou:
                camada.save(pasta / f'{c}_{r}.png'); salvos += 1
    print(f'mundo {LARG}x{ALT} · {cols}x{rows} blocos · {len(props)} objetos · {salvos} blocos pintados')


if __name__ == '__main__':
    main()
