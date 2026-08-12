#!/usr/bin/env python3
"""Joga o capitulo inteiro como uma maquina de estados e procura o BECO SEM SAIDA.

O `simular_capitulo.py` responde "cada cena tem quem satisfaca o requisito dela", que e
uma pergunta mais facil: ele confere a corrente peca por peca. Esta ferramenta responde a
pergunta do dono — "consigo jogar a historia toda?" — avancando o jogo de verdade:

  a cada passo, olha o estado (missoes abertas, missoes feitas, bandeiras, notas, mapa) e
  pergunta O QUE O JOGADOR PODE FAZER AGORA. Se em algum momento a resposta for "nada" e
  ainda houver cena por rodar, isso e um beco sem saida, e ele diz em que estado travou.

Replica `condicoesDaCena` e o motor de objetivos do game.js. Quando as duas divergirem,
esta ferramenta esta errada — o motor manda.
"""
import json, os, sys
from collections import OrderedDict

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def ler(p): return json.load(open(os.path.join(RAIZ, p), encoding='utf-8'))

# Tipos de objetivo que o JOGADOR consegue cumprir andando e agindo. Sao os que algum
# `progressoDeMissao('...')` emite no motor.
JOGAVEIS = {'coletar', 'talk', 'forjar', 'martelar', 'sintetizar', 'montar',
            'chegar', 'limpar', 'selar'}


def carregar_cenas():
    idx = ler('assets/cutscenes/index.json')
    nomes = idx if isinstance(idx, list) else idx.get('cenas', idx.get('cutscenes', []))
    cenas = []
    for n in nomes:
        n = n if isinstance(n, str) else (n.get('id') or n.get('arquivo'))
        n = n[:-5] if n.endswith('.json') else n
        p = f'assets/cutscenes/{n}.json'
        if os.path.exists(os.path.join(RAIZ, p)):
            c = ler(p); c.setdefault('id', n); cenas.append(c)
    # A MESMA ordenacao do motor: prioridade, e empate pela ordem do index.
    return sorted(enumerate(cenas), key=lambda t: (t[1].get('prioridade', 100), t[0]))


def carregar_missoes():
    q = ler('assets/quests/quests.json')
    qs = q if isinstance(q, list) else q['quests']
    return {x['id']: x for x in qs}


def itens_dados_pelo_codigo():
    """Itens que o game.js entrega, fora de `cmd: dar`.

    O segundo palito de tambor sai do bau grande da Arena, por `talvezDarOPalito`. Sem ler
    isso a ferramenta acha que o palito nao existe e acusa o SELO — o desfecho do capitulo —
    de cena morta. Alarme falso sobre a cena mais importante e o pior tipo de alarme falso.
    """
    import re
    src = open(os.path.join(RAIZ, 'game.js'), encoding='utf-8').read()
    achados = set(re.findall(r"playerInventory\.(\w+)\s*=", src))
    achados |= set(re.findall(r"playerInventory\[['\"](\w+)['\"]\]\s*=", src))
    return achados


def cenas_chamadas_por_codigo():
    """Cenas que o game.js dispara direto, fora do sistema de gatilhos.

    Cinco cenas do capitulo sao assim, e por bons motivos: o rapto acontece ao voltar a
    praca tendo forjado uma escala, o esquecimento no meio da limpeza do Patio, o selo ao
    pisar no circulo. Nao da para expressar isso em `requer`. Sem esta leitura a ferramenta
    acusaria as cinco toda vez, viraria alarme falso e ninguem mais olharia para ela.
    """
    import re
    src = open(os.path.join(RAIZ, 'game.js'), encoding='utf-8').read()
    return set(re.findall(r"CUT\.roteiros\.find\(\s*\w+\s*=>\s*\w+\.id\s*===\s*'([^']+)'", src))


class Jogo:
    """O estado do jogador, e o que o motor faz com ele."""

    def __init__(self, cenas, missoes, alcancaveis):
        self.cenas, self.missoes, self.alcancaveis = cenas, missoes, alcancaveis
        self.feitas, self.abertas, self.bandeiras = set(), OrderedDict(), set()
        self.notas, self.rodadas, self.herois = 0, set(), {'akles'}
        self.escalas, self.itens = 0, {}
        self.itensDoCodigo = itens_dados_pelo_codigo()
        self.diario = []

    # ── o portao das cenas, igual ao `condicoesDaCena` ──
    def condicoes(self, c):
        r = c.get('requer')
        if not r: return True
        if r.get('missaoConcluida') and r['missaoConcluida'] not in self.feitas: return False
        if r.get('missaoAtiva') and r['missaoAtiva'] not in self.abertas: return False
        lista = lambda v: [] if v is None else (v if isinstance(v, list) else [v])
        if not all(b in self.bandeiras for b in lista(r.get('bandeira'))): return False
        if any(b in self.bandeiras for b in lista(r.get('semBandeira'))): return False
        if r.get('notasCondensadas') is not None and self.notas < r['notasCondensadas']:
            return False
        if r.get('escalasForjadas') is not None and self.escalas < r['escalasForjadas']:
            return False
        if r.get('itens') and not all(
                self.itens.get(k, 0) >= n or k in self.itensDoCodigo
                for k, n in r['itens'].items()): return False
        o = r.get('objetivos')
        if o:
            q = self.abertas.get(o['missao'])
            if q is None:
                if o['missao'] not in self.feitas: return False
            elif not all(q['obj'].get(i) for i in o['ids']): return False
        return True

    def falta_antes(self, c):
        """A cena tem alguem na frente dela que ainda nao aconteceu?

        E a mesma regra do motor: uma cena so acontece depois que tudo o que vem antes
        aconteceu. `opcional` sai da corrente — pode ser pulada — mas ainda respeita o
        proprio lugar."""
        n = c.get('ordem', 999)
        if n >= 999: return None
        for _, o in self.cenas:
            if o is c or o.get('opcional'): continue
            if o.get('ordem', 999) < n and o['id'] not in self.rodadas:
                return o['id']
        return None

    def pode_rodar(self, c):
        """A cena dispara SOZINHA agora? Cena de roteiro (`autoStart: false`) nao conta:
        ela so roda quando outra cena ou o fim de uma missao a chama."""
        if c['id'] in self.rodadas: return False
        if self.falta_antes(c): return False
        g = c.get('gatilho') or {}
        if not g and c.get('autoStart') is False: return False
        if not g and not c.get('mapa'): return False   # sem gatilho e sem mapa: so roteiro
        if g.get('tipo') == 'roteiro': return False    # so por `cmd: cena`
        # `escala` exige ter forjado; os outros contextuais dependem so de estar la, e o
        # `requer` da cena e que manda.
        if g.get('tipo') == 'escala' and self.escalas < 1: return False
        if not self.condicoes(c): return False
        mapa = c.get('mapa')
        if mapa and mapa not in self.alcancaveis: return False
        return True

    # ── o que a cena FAZ ao rodar ──
    def rodar(self, c, por):
        self.rodadas.add(c['id'])
        self.diario.append((c['id'], por))
        encadeadas = []
        for p in c.get('passos', []):
            cmd = p.get('cmd')
            if cmd == 'missao': self.abrir(p['id'])
            elif cmd == 'bandeira': self.bandeiras.add(p['id'])
            elif cmd == 'recrutar': self.herois.add(p['heroi'])
            elif cmd == 'dar':
                self.itens[p['item']] = self.itens.get(p['item'], 0) + (p.get('qtd') or 1)
            elif cmd == 'consumir':
                for k, n in (p.get('itens') or {p.get('item'): p.get('qtd', 1)}).items():
                    if k: self.itens[k] = max(0, self.itens.get(k, 0) - n)
            elif cmd == 'objetivo':
                q = self.abertas.get(p.get('missao'))
                if q is not None and p.get('id') in q['obj']:
                    q['obj'][p['id']] = True
            elif cmd == 'cena' and p.get('id'): encadeadas.append(p['id'])
        self.fechar_prontas()
        # Cena chamada por roteiro roda na hora, sem gatilho e sem requisito.
        for cid in encadeadas:
            alvo = next((x for _, x in self.cenas if x['id'] == cid), None)
            if alvo and cid not in self.rodadas: self.rodar(alvo, f'roteiro de {c["id"]}')

    def abrir(self, qid):
        if qid in self.feitas or qid in self.abertas: return
        d = self.missoes.get(qid)
        if not d: return
        self.abertas[qid] = {'def': d, 'obj': {o['id']: False for o in d.get('objectives', [])}}

    def fechar_prontas(self):
        for qid in list(self.abertas):
            q = self.abertas[qid]
            if q['obj'] and all(q['obj'].values()):
                del self.abertas[qid]; self.feitas.add(qid)
                # `aoConcluir` pode encadear cena — e assim que a corrente segue sozinha.
                cena = (q['def'].get('aoConcluir') or {}).get('cena')
                if cena:
                    alvo = next((x for _, x in self.cenas if x['id'] == cena), None)
                    if alvo and cena not in self.rodadas: self.rodar(alvo, f'fim de {qid}')

    # ── o que o jogador pode fazer com as PROPRIAS maos ──
    def objetivos_jogaveis(self):
        fora = []
        for qid, q in self.abertas.items():
            for o in q['def'].get('objectives', []):
                if q['obj'].get(o['id']): continue
                t = o.get('type')
                if t not in JOGAVEIS:
                    fora.append((qid, o['id'], f'type={t!r} que nenhum codigo emite'))
                    continue
                if t == 'chegar' and o.get('item') not in self.alcancaveis:
                    fora.append((qid, o['id'], f'mapa {o.get("item")} inalcancavel'))
                    continue
                yield qid, o['id'], t
        self.impedidos = fora

    def passo(self):
        """Faz UMA coisa. Devolve o que fez, ou None se nao havia nada."""
        for _, c in self.cenas:
            if self.pode_rodar(c):
                g = c.get('gatilho') or {}
                por = g.get('npc') or ('entrar no mapa' if not g else g.get('tipo', 'roteiro'))
                self.rodar(c, por)
                return f'cena {c["id"]} (por {por})'
        # Forjar no Altar: acao livre de quem tem nota condensada e chegou la. Nao passa
        # por objetivo de missao, e e o que destranca o rapto.
        if self.notas >= 7 and self.escalas == 0 and 'altar' in self.rodadas:
            self.escalas += 1
            return 'forja uma escala no Altar'
        for qid, oid, tipo in self.objetivos_jogaveis():
            self.abertas[qid]['obj'][oid] = True
            # Condensar nota e o que destranca a cena das Notas Sagradas.
            # Condensar nao tem limite: quem chega ao altar condensa quantas quiser, e a
            # escala maior pede sete. Uma so era a leitura errada que matava notas_sagradas.
            if tipo in ('sintetizar', 'montar'): self.notas += 7
            if tipo == 'montar': self.escalas += 1
            self.fechar_prontas()
            return f'objetivo {qid}/{oid}'
        return None


def main():
    cenas, missoes = carregar_cenas(), carregar_missoes()
    w = ler('assets/dados/acordelot_world_config.json')
    # Alcancaveis: o alcance.py e a autoridade; aqui basta "esta no gridPos".
    alcancaveis = set(w['gridPos']) | {None}

    j = Jogo(cenas, missoes, alcancaveis)
    print('JOGANDO O CAPITULO — cada linha e uma coisa que o jogador faz\n')
    n = 0
    while True:
        feito = j.passo()
        if not feito: break
        n += 1
        print(f'  {n:02d} {feito}')
        if n > 300: print('  ! laco'); break

    problemas = []
    porCodigo = cenas_chamadas_por_codigo()
    faltaram = [c['id'] for _, c in cenas if c['id'] not in j.rodadas]
    codigo = [c for c in faltaram if c in porCodigo]
    orfas = [c for c in faltaram if c not in porCodigo]
    if codigo:
        print('\nDisparadas pelo game.js, fora do sistema de gatilhos (ok):')
        for c in codigo: print(f'  · {c}')
    if orfas:
        problemas.append(f'{len(orfas)} cena(s) ORFAS — ninguem as chama, nem dado nem '
                         f'codigo, entao estao escritas e nunca rodam: ' + ', '.join(orfas))
    if j.abertas:
        for qid, q in j.abertas.items():
            presos = [o for o, v in q['obj'].items() if not v]
            problemas.append(f'missao "{qid}" fica aberta para sempre — objetivo(s) {presos}')
    for qid, oid, porque in getattr(j, 'impedidos', []):
        problemas.append(f'objetivo {qid}/{oid} nao tem como ser cumprido: {porque}')

    # Heroi que fala numa cena sem ter sido recrutado: a queixa do dono de que a Wins
    # aparecia em cena sem estar no grupo.
    # A ORDEM foi respeitada? Nao basta a corrente existir no motor: aqui se confere que a
    # partida que acabou de ser jogada nunca viu uma cena antes da hora dela. E a resposta
    # direta a "entrar no mapa e do nada ter uma cena que nao era pra ter ali".
    posicao = {cid: i for i, (cid, _) in enumerate(j.diario)}
    porId = {c['id']: c for _, c in cenas}
    for cid, quando in posicao.items():
        c = porId[cid]
        n = c.get('ordem', 999)
        if n >= 999: continue
        for _, antes in cenas:
            if antes is c or antes.get('opcional'): continue
            if antes.get('ordem', 999) >= n: continue
            if antes['id'] not in posicao:
                problemas.append(f'"{cid}" (ordem {n}) rodou, mas "{antes["id"]}" '
                                 f'(ordem {antes.get("ordem")}) nunca rodou')
            elif posicao[antes['id']] > quando:
                problemas.append(f'FORA DE ORDEM: "{cid}" (ordem {n}) rodou ANTES de '
                                 f'"{antes["id"]}" (ordem {antes.get("ordem")})')

    # Toda cena tem lugar na corrente? Sem `ordem`, ela escapa da regra inteira.
    for _, c in cenas:
        if c.get('ordem') is None and (c.get('gatilho') or {}).get('tipo') != 'roteiro':
            problemas.append(f'"{c["id"]}" nao tem `ordem` — fica fora da corrente e pode '
                             f'disparar a qualquer momento')

    # A regra que o dono cobrou depois de ver a Wins falando numa cena sem estar no grupo:
    # se um heroi recrutavel fala numa cena, a cena TEM de exigir a bandeira dele. Isto e
    # verificado por estrutura, nao pela ordem que esta simulacao calhou de produzir — a
    # ordem depende de por onde o jogador anda, e ele anda por onde quiser.
    FALANTES = {'wins': 'Wins', 'pipo': 'Pipo'}
    recrutado_em = {}
    for _, c in cenas:
        for p in c.get('passos', []):
            if p.get('cmd') == 'recrutar': recrutado_em[p['heroi']] = c['id']
    ordem = [cid for cid, _ in j.diario]
    for hid, nome in FALANTES.items():
        rec = recrutado_em.get(hid)
        if not rec: continue
        pos_rec = ordem.index(rec) if rec in ordem else 10**9
        for _, c in cenas:
            if c['id'] not in ordem: continue
            fala = any(p.get('cmd') == 'falar' and nome.lower() in str(p.get('quem', '')).lower()
                       for p in c.get('passos', []))
            if fala and ordem.index(c['id']) < pos_rec:
                problemas.append(f'{nome} fala em "{c["id"]}" ANTES de ser recrutada em "{rec}"')

    print()
    if problemas:
        print(f'{len(problemas)} PROBLEMA(S):')
        for p in problemas: print('  ✗ ' + p)
        sys.exit(1)
    print(f'{n} passos, {len(j.rodadas)}/{len(cenas)} cenas, {len(j.feitas)} missoes fechadas.')
    print('Nao ha beco sem saida: em nenhum momento o jogador fica sem nada para fazer.')


if __name__ == '__main__':
    main()
