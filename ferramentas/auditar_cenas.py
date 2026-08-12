#!/usr/bin/env python3
"""Confere se cada cena PODE disparar e se cada passo dela tem com o que trabalhar.

Escrito depois de a cena do Pipo nunca ter rodado por causa de uma missão que nunca
concluía. Erro desse tipo é invisível jogando — só aparece se alguém cruzar os dados.
"""
import json, glob, os, re, io, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def ler(p): return json.load(open(os.path.join(RAIZ, p)))

cfg   = ler('assets/dados/acordelot_world_config.json')
mapas = set(cfg.get('sceneNames', {}))
npcs  = ler('assets/dados/npcs.json'); npcs = npcs if isinstance(npcs, list) else npcs['npcs']
quests= {q['id']: q for q in ler('assets/quests/quests.json')['quests']}
mons  = set(ler('assets/dados/monsters.json')['types'])
motor = io.open(os.path.join(RAIZ,'game.js'), encoding='utf-8').read()
videos= {os.path.basename(v) for v in glob.glob(os.path.join(RAIZ,'assets/videos/*'))}
cenas = {}
for f in glob.glob(os.path.join(RAIZ,'assets/cutscenes/*.json')):
    if f.endswith('index.json'): continue
    d = json.load(open(f)); cenas[d['id']] = d
indice = ler('assets/cutscenes/index.json')
indice = indice if isinstance(indice, list) else (indice.get('cenas') or indice.get('scenes'))

# Comandos que o motor conhece.
conhecidos = set(re.findall(r"case '([a-zA-Zç]+)':", motor))
# Tipos de objetivo que algum código realmente cumpre.
tipos_ok = set(re.findall(r"progressoDeMissao\('([a-z_]+)'", motor))

def npcs_do_mapa(m):
    return [ (n.get('name') or '').strip().lower() for n in npcs if n.get('mapKey')==m ]

def tem_npc(m, alvo):
    a = str(alvo).strip().lower()
    return any(a==x or x.startswith(a) or a in x for x in npcs_do_mapa(m))

problemas = []
def erro(cena, msg): problemas.append(('ERRO', cena, msg))
def aviso(cena, msg): problemas.append(('AVISO', cena, msg))

for cid, d in sorted(cenas.items()):
    if cid not in indice: erro(cid, 'não está no index.json — o jogo nem carrega')
    m = d.get('mapa')
    if m and m not in mapas: erro(cid, 'mapa inexistente: %s' % m)

    g = d.get('gatilho') or {}
    if g.get('tipo')=='falar':
        if not m: erro(cid, 'gatilho de fala sem mapa definido')
        elif not tem_npc(m, g.get('npc')): erro(cid, 'gatilho fala com "%s", que não está nesse mapa' % g.get('npc'))

    # Requisitos alcançáveis?
    r = d.get('requer') or {}
    for chave in ('missaoConcluida','missaoAtiva'):
        q = r.get(chave)
        if q and q not in quests: erro(cid, '%s aponta missão inexistente: %s' % (chave, q))
    if r.get('objetivos'):
        qid = r['objetivos'].get('missao')
        q = quests.get(qid)
        if not q: erro(cid, 'requer objetivos de missão inexistente: %s' % qid)
        else:
            ids = {o['id'] for o in q['objectives']}
            for oid in r['objetivos'].get('ids', []):
                if oid not in ids: erro(cid, 'requer objetivo "%s" que não existe em %s' % (oid, qid))

    for i, p in enumerate(d['passos']):
        c = p.get('cmd')
        if c is None: continue
        if c not in conhecidos: erro(cid, 'passo %d: comando desconhecido "%s"' % (i, c))
        if c=='video' and p.get('arquivo') not in videos:
            erro(cid, 'passo %d: vídeo ausente — %s' % (i, p.get('arquivo')))
        if c=='missao' and p.get('id') not in quests:
            erro(cid, 'passo %d: abre missão inexistente — %s' % (i, p.get('id')))
        if c=='monstro' and p.get('tipo') not in mons:
            erro(cid, 'passo %d: monstro inexistente — %s' % (i, p.get('tipo')))
        if c=='guiar' and p.get('para') not in mapas:
            erro(cid, 'passo %d: guia para mapa inexistente — %s' % (i, p.get('para')))
        if c in ('esperarPerto','acenar','andar','mostrar') and p.get('npc'):
            if str(p['npc']).lower() not in ('jogador','player') and m and not tem_npc(m, p['npc']):
                erro(cid, 'passo %d: %s precisa de "%s" nesse mapa' % (i, c, p['npc']))
        if c=='recrutar' and ("'%s'"%p.get('heroi')) not in motor:
            erro(cid, 'passo %d: herói inexistente — %s' % (i, p.get('heroi')))

# Conflito de gatilho: duas cenas disputando o MESMO NPC no mesmo mapa. O motor pega a
# primeira que casa, entao a de tras so roda se o jogador voltar a falar sem motivo — foi
# assim que a cena do Pipo perdeu para a da ponte e sumiu por varios playtests.
porGatilho = {}
for cid, d in cenas.items():
    g = d.get('gatilho') or {}
    if g.get('tipo') != 'falar': continue
    porGatilho.setdefault((d.get('mapa'), str(g.get('npc')).lower()), []).append(cid)
for (mapa, npc), lista in porGatilho.items():
    if len(lista) < 2: continue
    semCondicao = [c for c in lista if not (cenas[c].get('requer'))]
    if len(semCondicao) > 1:
        erro('gatilho:'+npc, 'cenas sem condicao disputando o mesmo NPC: %s' % ', '.join(semCondicao))
    # Prioridade explicita resolve; sem ela, a ordem do index decide no escuro.
    semPrio = [c for c in lista if cenas[c].get('prioridade') is None]
    if len(semPrio) > 1:
        aviso('gatilho:'+npc, 'ordem decide entre %s — considere `prioridade`' % ', '.join(semPrio))

# Objetivos que uma CENA fecha direto, por `cmd: objetivo`. Sao cumpriveis mesmo que nenhum
# `progressoDeMissao` emita aquele tipo: quem os fecha e o roteiro. Sem esta leitura, o
# objetivo de selar a memoria do Pipo — fechado pela cena do selo — era acusado de morto.
fechadosPorCena = set()
for cid, c in cenas.items():
    for p in c.get('passos', []):
        if p.get('cmd') == 'objetivo' and p.get('missao') and p.get('id'):
            fechadosPorCena.add((p['missao'], p['id']))

# Missões: todo objetivo tem que ser cumprível.
for qid, q in sorted(quests.items()):
    for o in q['objectives']:
        t = o.get('type')
        porCena = (qid, o.get('id')) in fechadosPorCena
        if not t and not porCena:
            erro('missão:'+qid, 'objetivo "%s" sem type — nunca conclui' % o.get('id'))
        elif t and t not in tipos_ok and not porCena:
            erro('missão:'+qid, 'objetivo "%s" com type "%s" que nenhum código cumpre e nenhuma cena fecha' % (o.get('id'), t))
        elif t and t != 'talk' and not porCena and not (o.get('item') or o.get('npc')):
            erro('missão:'+qid, 'objetivo "%s" sem item/npc — o casamento nunca bate' % o.get('id'))


# ── Voz sem corpo ─────────────────────────────────────────────────────────────
# O dono jogou o rapto e viu: "nocth e vexor nao estao na cidade, somente o dialogo deles
# acontece". Uma cena pode fazer QUALQUER nome falar e o motor nao reclama: a caixa aparece
# com o nome escrito e ninguem em cena. Aqui todo falante precisa de corpo — ou e o
# jogador, ou e NPC daquele mapa, ou a propria cena o invoca.
FALANTES_LIVRES = {'personagem', 'akles', 'jogador', 'narrador', ''}
HEROIS = {'wins': 'wins_no_grupo'}      # heroi anda com o grupo se a bandeira exigir

def _n(x): return str(x or '').lower().strip()

# Voz que NAO tem corpo de proposito — o Altar falando, a Guardia da Escala. Nao da para
# adivinhar isso pelo nome, entao a cena DECLARA em `vozes: [...]`. Quem escreve diz "esta
# aqui e assim mesmo", e o resto continua sendo cobrado.
def vozes_declaradas(d):
    return {_n(v) for v in (d.get('vozes') or [])}

# Acompanhante atravessa os mapas com o jogador: onde ele esta, o companheiro esta.
COMPANHEIROS = {_n(s.get('npc')) for d in cenas.values() for s in d['passos']
                if s.get('cmd') == 'acompanhante' and s.get('npc')}

# A cena que RECRUTA o heroi e onde ele aparece pela primeira vez: exigir a bandeira dela
# mesma seria exigir que ele ja estivesse no grupo antes de entrar nele.
RECRUTA = {_n(s.get('heroi')): cid for cid, d in cenas.items()
           for s in d['passos'] if s.get('cmd') == 'recrutar'}

for cid, d in sorted(cenas.items()):
    mapa = d.get('mapa')
    if not mapa: continue          # cena sem mapa acontece onde o jogador estiver
    presentes = {_n(n.get('name')) for n in npcs if n.get('mapKey') == mapa}
    invocados = {_n(s.get('tipo')) for s in d['passos'] if s.get('cmd') == 'monstro'}
    req = d.get('requer') or {}
    bands = req.get('bandeira')
    bands = [] if bands is None else (bands if isinstance(bands, list) else [bands])
    for s in d['passos']:
        if s.get('cmd') != 'falar': continue
        quem = _n(s.get('quem'))
        if quem in FALANTES_LIVRES: continue
        if any(quem in x or x in quem for x in presentes if x): continue
        if any(quem in x or x in quem for x in invocados if x): continue
        if quem in vozes_declaradas(d): continue
        if any(quem in x or x in quem for x in COMPANHEIROS if x): continue
        h = next((k for k in HEROIS if k in quem), None)
        if h:
            if RECRUTA.get(h) == cid: continue
            if HEROIS[h] not in bands:
                erro('cena:'+cid, '"%s" fala mas a cena nao exige a bandeira "%s" — '
                     'ela pode nao estar no grupo' % (s.get('quem'), HEROIS[h]))
            continue
        erro('cena:'+cid, '"%s" fala e nao esta no mapa nem e invocado pela cena — voz sem corpo'
             % s.get('quem'))

# Monstro que a cena invoca e nao remove fica de pe no cenario depois dela.
for cid, d in sorted(cenas.items()):
    inv = [s for s in d['passos'] if s.get('cmd') == 'monstro']
    if inv and not any(s.get('cmd') in ('limparMonstros', 'esperarMortos') for s in d['passos']):
        aviso('cena:'+cid, '%d monstro(s) invocado(s) sem `limparMonstros` — ficam no cenario' % len(inv))

erros = [p for p in problemas if p[0]=='ERRO']
for nivel, cena, msg in problemas:
    print('%-6s %-22s %s' % (nivel, cena, msg))
print('\n%d erro(s), %d aviso(s), %d cenas, %d missões'
      % (len(erros), len(problemas)-len(erros), len(cenas), len(quests)))
sys.exit(1 if erros else 0)

