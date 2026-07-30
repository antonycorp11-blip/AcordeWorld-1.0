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
    cache={}
    def spr(p):
        if p not in cache: cache[p]=Image.open(cat[p]['sprite']).convert('RGBA')
        return cache[p]
    def desenha(p):
        d=cat[p['prop']]; im=spr(p['prop']); e=p.get('escala',1)
        if d.get('plano')=='chao':
            w,h=im.width*e, im.height*e; x,y=p['x']-w/2, p['y']-h/2
        else:
            h=d.get('altura',im.height)*e; w=h*im.width/im.height
            x,y=p['x']-w/2, p['y']-h*d.get('pe',.9)
        im2=im.resize((max(1,int(w)),max(1,int(h))), Image.LANCZOS)
        if p.get('flipX'): im2=im2.transpose(Image.FLIP_LEFT_RIGHT)
        tela.paste(im2,(int(x),int(y)),im2)
    ps=mundo['props']
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
