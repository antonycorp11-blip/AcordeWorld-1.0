#!/usr/bin/env python3
"""Verificacao estatica do JOGO (nao do editor de mapas).

Procura o que quebra em tempo de execucao e nao aparece ate alguem jogar:
sprite que nao existe, funcao chamada e nunca definida, id declarado duas vezes,
dialogo referenciado sem arquivo, item citado que nao esta no catalogo.
"""
import json, re, io, os, glob, sys
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def ler(p): return json.load(open(os.path.join(RAIZ, p)))
motor = io.open(os.path.join(RAIZ, 'game.js'), encoding='utf-8').read()

# Comentario em portugues tem palavra seguida de "(" o tempo todo ("a cena (que roda)").
# Sem tirar comentario e string, o teste de "funcao inexistente" vira ruido puro.
def sem_ruido(t):
    t = re.sub(r'/\*.*?\*/', ' ', t, flags=re.S)
    t = re.sub(r'(?m)//.*$', ' ', t)
    t = re.sub(r'`(?:[^`\\]|\\.)*`', '``', t)
    t = re.sub(r"'(?:[^'\\\n]|\\.)*'", "''", t)
    t = re.sub(r'"(?:[^"\\\n]|\\.)*"', '""', t)
    return t
codigo = sem_ruido(motor)

erros, avisos = [], []
def E(cat, msg): erros.append((cat, msg))
def A(cat, msg): avisos.append((cat, msg))

# ── 1. Sprites de prop que nao existem em disco ────────────────────────────────
objs = ler('assets/dados/objects.json')
for pid, d in objs['props'].items():
    spr = d.get('sprite')
    # Prop desenhado pelo editor vem embutido em base64: nao e arquivo.
    if not spr or spr.startswith('data:'): continue
    if not os.path.exists(os.path.join(RAIZ, spr)):
        E('sprite', 'prop "%s" (%s) aponta para %s, que nao existe' % (pid, d.get('nome',''), spr))

# ── 2. Funcoes chamadas e nunca definidas ──────────────────────────────────────
definidas = set(re.findall(r'\bfunction\s+([A-Za-z_$][\w$]*)', codigo))
definidas |= set(re.findall(r'\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function|\()', codigo))
definidas |= set(re.findall(r'\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*[A-Za-z_$][\w$]*\s*=>', codigo))
definidas |= set(re.findall(r'([A-Za-z_$][\w$]*)\s*[:=]\s*(?:async\s*)?(?:function|\([^)]*\)\s*=>)', codigo))
definidas |= set(re.findall(r'window\.([A-Za-z_$][\w$]*)\s*=', codigo))
# Métodos de objetos (`disponivel() {}` / `async entrar() {}`) também são definições.
# E callbacks recebidos como parâmetro (`function comSuavizacao(..., desenhar)`) são
# chamados legitimamente dentro da função, embora não tenham declaração própria.
definidas |= set(re.findall(r'(?m)^\s*(?:async\s+)?([a-zA-Z_$][\w$]*)\s*\([^)]*\)\s*\{', codigo))
for params in re.findall(r'\bfunction(?:\s+[A-Za-z_$][\w$]*)?\s*\(([^)]*)\)', codigo):
    definidas |= {p.strip() for p in params.split(',') if re.fullmatch(r'[A-Za-z_$][\w$]*', p.strip())}
for params in re.findall(r'\(([^()]*)\)\s*=>', codigo):
    definidas |= {p.strip() for p in params.split(',') if re.fullmatch(r'[A-Za-z_$][\w$]*', p.strip())}
chamadas = set(re.findall(r'(?<![\w.$])([a-z][A-Za-z0-9_$]{3,})\s*\(', codigo))
NATIVAS = set('''if for while switch catch return typeof function requestAnimationFrame setTimeout
setInterval clearTimeout clearInterval parseInt parseFloat isNaN isFinite encodeURIComponent
decodeURIComponent fetch alert confirm prompt console require import await Promise Math JSON
Object Array String Number Boolean Date Map Set WeakMap Image Audio Blob URL FormData Event
CustomEvent Error TypeError RangeError structuredClone queueMicrotask btoa atob
cancelAnimationFrame matchMedia getComputedStyle async await'''.split())
# Palavras que aparecem coladas em "(" dentro de trecho que o filtro nao pegou.
NATIVAS |= {'aplica', 'aplicar', 'liberado'}
faltando = sorted(c for c in chamadas - definidas - NATIVAS
                  if not re.search(r'\b%s\s*[:=]' % re.escape(c), codigo))
for f in faltando[:40]:
    E('funcao', 'chamada "%s(" e nunca definida' % f)

# ── 3. Declaracoes duplicadas no topo (const/let/function com mesmo nome) ───────
from collections import Counter
topo = Counter(re.findall(r'^(?:function\s+([A-Za-z_$][\w$]*)|const\s+([A-Z_][A-Z0-9_]*)\s*=)',
                          motor, re.M))
nomes = Counter()
for a, b in re.findall(r'^(?:function\s+([A-Za-z_$][\w$]*)|const\s+([A-Z_][A-Z0-9_]*)\s*=)', codigo, re.M):
    nomes[a or b] += 1
for n, q in nomes.items():
    if q > 1: E('duplicado', 'declarado %dx no topo: %s' % (q, n))

# ── 4. Dialogos referenciados por NPC sem arquivo ──────────────────────────────
npcs = ler('assets/dados/npcs.json'); npcs = npcs if isinstance(npcs, list) else npcs['npcs']
temDlg = {os.path.basename(p)[:-5] for p in glob.glob(os.path.join(RAIZ, 'assets/dialogues/*.json'))}
for n in npcs:
    d = n.get('dialogue')
    if d and d != 'none' and d not in temDlg and not d.endswith('_dlg'):
        E('dialogo', 'NPC "%s" usa dialogo "%s", sem arquivo' % (n.get('name'), d))

# ── 5. Itens dados por cena que nao existem no catalogo ────────────────────────
itens = set()
try:
    for it in ler('assets/dados/skins.json').get('items', []): itens.add(it.get('id'))
except Exception: pass
itens |= set(re.findall(r"id:\s*'([a-z0-9_]+)'", motor))
itens |= {'wood','stone','clave','fragmento','fragmento_puro','tom','semitom','partitura'}
itens |= {'palito_1','palito_2'}
for f in glob.glob(os.path.join(RAIZ, 'assets/cutscenes/*.json')):
    if f.endswith('index.json'): continue
    c = json.load(open(f))
    for p in c['passos']:
        if p.get('cmd') == 'dar' and p.get('item') and p['item'] not in itens:
            A('item', '%s da "%s", que nao achei no catalogo' % (c['id'], p['item']))


# ── NPC plantado em chao que nao anda ─────────────────────────────────────────
# O Bardo Lucian estava sobre um canto que a mascara de estrada nao aceita. Parado ali ele
# nao conseguia dar UM passo, entao o `andar` da cena do rapto era descartado em silencio e
# ele nunca atravessava a praca para entregar o palito. O motor hoje desencalha sozinho,
# mas quem esta em chao bloqueado tambem nao pode ser empurrado, nao segue o jogador e fica
# preso em qualquer encenacao — e melhor mover no editor.
# A regra e a do `isWalkable`: verde > 100 e alfa > 50 na mascara, com folga de 4px em cruz.
try:
    from PIL import Image
    SEM_CORPO = {'porta', 'signpost', 'forge_entrance', 'lago_sorteio', 'ponto_martelada'}
    mascaras = {}
    def carregar(mapa):
        cam = os.path.join(RAIZ, f'assets/cenarios/mascaras/acordelot_road_{mapa}_mask.png')
        if not os.path.exists(cam): return None
        im = Image.open(cam).convert('RGBA'); px = im.load(); w, h = im.size
        # O motor so usa a mascara se ela tiver ALGUMA pintura (`hasRoadPaint`): mascara em
        # branco significa cenario inteiro andavel. Sem esta leitura eu acusava NPC parado
        # em chao livre — e foi o que aconteceu: seis avisos falsos, incluindo o Dorn.
        # So 5 dos 33 cenarios tem colisao pintada.
        for y in range(0, h, 9):
            for x in range(0, w, 9):
                if px[x, y][3] > 50: return px
        return None

    def andavel(mapa, x, y):
        if mapa not in mascaras: mascaras[mapa] = carregar(mapa)
        px = mascaras[mapa]
        if px is None: return True          # mapa sem pintura: tudo anda
        for dx, dy in ((0,0), (-4,0), (4,0), (0,-4), (0,4)):
            try: p = px[int(x+dx), int(y+dy)]
            except Exception: return False
            if not (p[1] > 100 and p[3] > 50): return False
        return True

    npcs_j = json.load(open(os.path.join(RAIZ, 'assets/dados/npcs.json')))
    npcs_j = npcs_j if isinstance(npcs_j, list) else npcs_j['npcs']
    for n in npcs_j:
        if n.get('type') in SEM_CORPO: continue
        if not andavel(n.get('mapKey'), n.get('x', 0), n.get('y', 0)):
            A('chao', '"%s" esta em chao bloqueado (%d,%d) — nao consegue andar em cena'
              % (n.get('name'), n.get('x', 0), n.get('y', 0)))
except ImportError:
    pass

for cat, msg in erros: print('ERRO   %-10s %s' % (cat, msg))
for cat, msg in avisos: print('AVISO  %-10s %s' % (cat, msg))
print('\n%d erro(s), %d aviso(s)' % (len(erros), len(avisos)))
sys.exit(1 if erros else 0)
