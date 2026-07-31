#!/usr/bin/env python3
"""Renderiza o mundo em imagem, com a mesma ordem de desenho do jogo."""
import json, sys
from PIL import Image

def render(destino_geral, recortes=()):
    mundo=json.load(open('assets/mundo/mundo.json'))
    cat=json.load(open('assets/objects.json'))['props']
    BW,BH=mundo['bloco']['w'],mundo['bloco']['h']
    W,H=mundo['cols']*BW, mundo['rows']*BH
    tela=Image.new('RGB',(W,H),(60,90,50))
    for k,cam in mundo['blocos'].items():
        c,r=map(int,k.split('_'))
        tela.paste(Image.open(cam).convert('RGB'),(c*BW,r*BH))
    # camada de pintura por cima do chão, como no jogo
    from pathlib import Path
    for k in mundo['blocos']:
        p = Path('assets/mundo/pintura')/f'{k}.png'
        if p.exists():
            c,r=map(int,k.split('_'))
            pin=Image.open(p).convert('RGBA')
            tela.paste(pin,(c*BW,r*BH),pin)
    cache={}
    def spr(p):
        if p not in cache: cache[p]=Image.open(cat[p]['sprite']).convert('RGBA')
        return cache[p]
    def desenha(p):
        # Espelho, escala por eixo e giro em torno do PÉ — a mesma conta do motor, para
        # a prévia não mentir sobre o que o jogo mostra.
        import math
        d=cat[p['prop']]; im=spr(p['prop'])
        ex=p.get('ex', p.get('escala',1)); ey=p.get('ey', p.get('escala',1))
        hb=d.get('altura', im.height)
        h=hb*ey; w=hb*(im.width/im.height)*ex
        pe = .5 if d.get('plano')=='chao' else d.get('pe',.9)
        im2=im.resize((max(1,int(w)),max(1,int(h))), Image.LANCZOS)
        if p.get('flipX'): im2=im2.transpose(Image.FLIP_LEFT_RIGHT)
        rot=p.get('rot',0)
        ancora=(w/2, h*pe)                       # o pé, dentro do sprite
        if rot:
            g=math.degrees(rot)
            grande=im2.rotate(-g, expand=True, resample=Image.BICUBIC)
            c=math.cos(-rot); sn=math.sin(-rot)
            ax=ancora[0]-w/2; ay=ancora[1]-h/2
            nx=ax*c-ay*sn + grande.width/2
            ny=ax*sn+ay*c + grande.height/2
            im2=grande; ancora=(nx,ny)
        tela.paste(im2,(int(p['x']-ancora[0]), int(p['y']-ancora[1])), im2)
    # Props órfãos (removidos do catálogo depois de plantados) não podem derrubar a
    # prévia: some com eles em silêncio, como o jogo já faz.
    ps=[p for p in mundo['props'] if p['prop'] in cat]
    for p in ps:
        if cat[p['prop']].get('plano')=='chao': desenha(p)
    for p in sorted([q for q in ps if cat[q['prop']].get('plano')!='chao'], key=lambda q:q['y']):
        desenha(p)
    tela.resize((W//4,H//4), Image.LANCZOS).save(destino_geral)
    for nome,(x,y,w,h) in recortes:
        tela.crop((x,y,x+w,y+h)).save(nome)
    print(f'{W}x{H} · {len(ps)} objetos')

if __name__ == '__main__':
    render(sys.argv[1], [(a.split('=')[0], tuple(map(int, a.split('=')[1].split(','))))
                         for a in sys.argv[2:]])
