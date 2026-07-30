#!/usr/bin/env python3
"""Leva o resultado de copiar_cenario.py para o mundo: blocos, pintura e objetos."""
import json, os
from pathlib import Path
from PIL import Image, ImageChops

RAIZ = Path(__file__).resolve().parent.parent
BW, BH = 1024, 571
TEX = {'terra': ('assets/texturas/terra_1.jpg', 2),
       'laje':  ('assets/texturas/laje_1.jpg', 4),
       'agua':  ('assets/texturas/areia_1.jpg', 2)}   # a água vem dos props de rio


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

    salvos = 0
    for c in range(cols):
        for r in range(rows):
            ox, oy = c * BW, r * BH
            camada = Image.new('RGBA', (BW, BH), (0, 0, 0, 0))
            usou = False
            for mat in ('terra', 'laje'):
                m = masc[mat].crop((ox, oy, ox + BW, oy + BH))
                if not m.getbbox(): continue
                usou = True
                chao = tiled(texturas[mat], BW, BH, ox, oy).convert('RGBA')
                chao.putalpha(m)
                camada = Image.alpha_composite(camada, chao)
            if usou:
                camada.save(pasta / f'{c}_{r}.png'); salvos += 1
    print(f'mundo {LARG}x{ALT} · {cols}x{rows} blocos · {len(props)} objetos · {salvos} blocos pintados')


if __name__ == '__main__':
    main()
