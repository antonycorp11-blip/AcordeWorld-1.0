#!/usr/bin/env python3
"""O jogador consegue CHEGAR em tudo que a história pede?

As outras duas ferramentas conferem cenas e missões. Esta confere geografia: partindo do
mapa inicial e seguindo só as placas que existem, onde dá para ir. Cenário com cena
escrita mas sem caminho ate ele e uma cena que ninguem ve.
"""
import json, glob, os, sys
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def ler(p): return json.load(open(os.path.join(RAIZ,p)))

cfg=ler('assets/dados/acordelot_world_config.json')
nomes=cfg['sceneNames']; inicio=cfg.get('startMap')
npcs=ler('assets/dados/npcs.json'); npcs=npcs if isinstance(npcs,list) else npcs['npcs']

saidas={}
for n in npcs:
    if n.get('type')=='signpost' and n.get('targetMapKey'):
        saidas.setdefault(n['mapKey'],set()).add(n['targetMapKey'])

vistos={inicio}; fila=[inicio]
while fila:
    k=fila.pop()
    for d in saidas.get(k,()):
        if d not in vistos and d in nomes: vistos.add(d); fila.append(d)

precisa={}
for f in sorted(glob.glob(os.path.join(RAIZ,'assets/cutscenes/*.json'))):
    if f.endswith('index.json'): continue
    d=json.load(open(f))
    if d.get('mapa'): precisa.setdefault(d['mapa'],[]).append(d['id'])
for q in ler('assets/quests/quests.json')['quests']:
    for o in q['objectives']:
        if o.get('type')=='chegar' and o.get('item'):
            precisa.setdefault(o['item'],[]).append('missão:'+q['id'])

print('Partindo de "%s", seguindo as placas:\n' % nomes.get(inicio, inicio))
print('ALCANÇÁVEIS (%d):' % len(vistos))
for k in sorted(vistos, key=lambda x: nomes.get(x,x)): print('   ✓', nomes.get(k,k))
ilhas=[k for k in nomes if k not in vistos]
print('\nILHAS — existem mas não há caminho até elas (%d):' % len(ilhas))
for k in sorted(ilhas, key=lambda x: nomes.get(x,x)):
    quem = precisa.get(k)
    marca = '  ← PRECISA: ' + ', '.join(quem) if quem else ''
    print('   ✗', nomes.get(k,k) + marca)

ruins=[k for k in precisa if k not in vistos]
print()
if ruins:
    print('QUEBRA: %d cenário(s) com cena ou missão apontando para lá, sem caminho.' % len(ruins))
else:
    print('Tudo que a história pede é alcançável.')
sys.exit(1 if ruins else 0)
