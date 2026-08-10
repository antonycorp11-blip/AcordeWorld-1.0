#!/usr/bin/env python3
"""Percorre o Capítulo 1 no papel e diz onde a corrente arrebenta.

A auditoria conferia se cada peça existe. Isto confere se dá para JOGAR: seguindo a
ordem da história, cada cena tem seu requisito satisfeito por alguma cena anterior?
Escrito depois de o Antony testar e travar em pontos que uma peça isolada não revela.
"""
import json, os, re, io, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def ler(p): return json.load(open(os.path.join(RAIZ, p)))

quests = {q['id']: q for q in ler('assets/quests/quests.json')['quests']}
motor  = io.open(os.path.join(RAIZ,'game.js'), encoding='utf-8').read()
ordem  = re.search(r'const ORDEM_DA_HISTORIA = \[(.*?)\];', motor, re.S).group(1)
ORDEM  = re.findall(r"'([a-z0-9_]+)'", ordem)
cenas  = {}
for cid in ORDEM:
    f = os.path.join(RAIZ, 'assets/cutscenes/%s.json' % cid)
    if os.path.exists(f): cenas[cid] = json.load(open(f))

feitas, ativas, bandeiras = set(), set(), set()
problemas = []

def conclui(qid):
    """Uma missão fecha quando todos os objetivos dela fecham."""
    ativas.discard(qid); feitas.add(qid)

for i, cid in enumerate(ORDEM):
    c = cenas.get(cid)
    if not c: problemas.append('cena %s não existe' % cid); continue
    r = c.get('requer') or {}

    q = r.get('missaoConcluida')
    if q and q not in feitas:
        problemas.append('%02d %s exige "%s" concluída, e nada antes conclui' % (i+1, cid, q))
    q = r.get('missaoAtiva')
    if q and q not in ativas:
        problemas.append('%02d %s exige "%s" ativa, e nada antes abre' % (i+1, cid, q))
    obj = r.get('objetivos')
    if obj and obj['missao'] not in ativas and obj['missao'] not in feitas:
        problemas.append('%02d %s exige objetivos de "%s", que nunca foi aberta'
                         % (i+1, cid, obj['missao']))

    # O que a cena faz com o estado.
    for p in c['passos']:
        if p.get('cmd') == 'missao':
            if p['id'] in feitas:
                problemas.append('%02d %s reabre "%s", já concluída' % (i+1, cid, p['id']))
            ativas.add(p['id'])
        if p.get('cmd') == 'bandeira': bandeiras.add(p['id'])

    # O que o jogador conclui entre uma cena e outra (o gatilho da próxima).
    prox = cenas.get(ORDEM[i+1]) if i+1 < len(ORDEM) else None
    if prox:
        pr = (prox.get('requer') or {}).get('missaoConcluida')
        if pr and pr in ativas: conclui(pr)

print('CADEIA DO CAPÍTULO 1 —', len(ORDEM), 'cenas\n')
for i, cid in enumerate(ORDEM):
    c = cenas.get(cid)
    if not c: continue
    r = c.get('requer') or {}
    dep = r.get('missaoConcluida') or r.get('missaoAtiva') or (r.get('objetivos') or {}).get('missao') or '—'
    abre = [p['id'] for p in c['passos'] if p.get('cmd') == 'missao'] or ['—']
    g = (c.get('gatilho') or {}).get('npc') or ('mapa' if c.get('autoStart') else 'roteiro')
    print('%02d %-18s por:%-10s exige:%-22s abre:%s' % (i+1, cid, g, dep, ','.join(abre)))

print()
if problemas:
    for p in problemas: print('QUEBRA:', p)
else:
    print('A corrente fecha: toda cena tem quem satisfaça o requisito dela.')
sys.exit(1 if problemas else 0)
