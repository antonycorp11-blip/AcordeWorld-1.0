#!/usr/bin/env python3
"""
Põe todas as folhas do mesmo herói na MESMA escala e na mesma célula.

Cada folha volta do gerador com um tamanho próprio: a de caminhada veio com o
personagem de 193 px de altura, a de parado com 248 — 28% maior. Trocar de folha ao
soltar a tecla faria o herói crescer de repente, o que é pior que não ter idle.

O que este script faz: mede a altura do personagem em cada folha, escolhe a MENOR como
referência (reduzir preserva o desenho; ampliar pixel art inventa pixel), reescala as
outras por vizinho mais próximo para não borrar, e regrava todas com a mesma célula e
os pés na mesma linha de base.

Rodar sempre com TODAS as folhas de uma vez — a referência sai do conjunto, então
processar uma sozinha depois desalinharia de novo.
"""
import json
import sys
from pathlib import Path
from PIL import Image

MARGEM = 6


def altura_do_corpo(q):
    """Altura do OMBRO aos PÉS — o corpo de verdade, sem cabeça nem arma.

    A régua anterior media dos pés ao topo da CABEÇA, descendo até a primeira linha larga.
    Funcionou para um personagem só, mas quebrou com o segundo: o cabelo da Wins é volumoso
    e largo, então a régua marcava o topo do cabelo como se fosse a cabeça. As duas folhas
    fechavam em 124 px de "corpo" e ainda assim o corpo dela era 11% menor que o dele —
    119 px de ombro ao pé contra 133.

    Ombro ao pé não depende de penteado, chapéu, lâmina erguida nem rastro. É a medida que
    faz dois personagens diferentes terem o mesmo tamanho na tela.
    """
    if not q:
        return 0
    binario = q.getchannel('A').point(lambda v: 255 if v else 0)
    somas = [v * q.width / 255 for v in binario.resize((1, q.height), Image.BOX).getdata()]
    maxw = max(somas) if somas else 0
    if not maxw:
        return 0
    # 55% da largura máxima é a linha dos ombros: cabeça e cabelo são mais estreitos que
    # o tronco com os braços, e lâmina ou rastro são muito mais estreitos ainda.
    ombro = next((y for y, w in enumerate(somas) if w >= maxw * 0.55), 0)
    base = max((y for y, w in enumerate(somas) if w > 0), default=q.height - 1)
    return base - ombro + 1


def quadros_da_folha(caminho, cols, lins):
    """Recorta cada célula pelo conteúdo. As folhas já vêm sem fundo daqui."""
    im = Image.open(caminho).convert('RGBA')
    CW, CH = im.width // cols, im.height // lins
    saida = []
    for li in range(lins):
        for ci in range(cols):
            cel = im.crop((ci * CW, li * CH, (ci + 1) * CW, (li + 1) * CH))
            bb = cel.getbbox()
            saida.append(cel.crop(bb) if bb else None)
    return saida


def main(entradas):
    folhas = []
    for spec in entradas:
        caminho, cols, lins = spec.split(':')
        cols, lins = int(cols), int(lins)
        qs = quadros_da_folha(caminho, cols, lins)
        # Mediana das medidas de rosto: um quadro isolado pode ter o rosto meio virado
        # ou coberto pela lâmina, e a mediana ignora esses sem precisar de exceção.
        # Mediana e não máximo: um quadro agachado ou muito inclinado mede menos, e a
        # mediana ignora esses extremos sem precisar de exceção.
        medidas = sorted(x for x in (altura_do_corpo(q) for q in qs if q) if x > 3)
        alt = medidas[len(medidas) // 2] if medidas else 0
        folhas.append({'caminho': caminho, 'cols': cols, 'lins': lins,
                       'quadros': qs, 'altura': alt})
        print(f'{Path(caminho).name:34} {cols}x{lins} · ombro ao pe: {alt} px')

    # A escala é UMA POR PERSONAGEM, tirada da folha de CAMINHADA dele.
    #
    # Medir cada folha separadamente não funciona: nas poses de ataque o corpo agacha, se
    # estica e a arma alarga a silhueta, e a mesma régua devolveu de 88 a 225 px entre as
    # folhas do mesmo personagem. Ajustar cada folha pela própria medida encolheria umas e
    # ampliaria outras, e o herói mudaria de tamanho a cada golpe.
    #
    # A caminhada é a pose neutra: em pé, braços ao lado, sem golpe deformando nada. Dela
    # sai um número por personagem, e esse número vale para todas as folhas dele.
    def dono(caminho):
        nome = Path(caminho).name
        return nome.split('_')[0]

    ref_por_heroi = {}
    for f in folhas:
        if '_caminhada' in Path(f['caminho']).name:
            ref_por_heroi[dono(f['caminho'])] = f['altura']
    faltando = {dono(f['caminho']) for f in folhas} - set(ref_por_heroi)
    if faltando:
        raise SystemExit(f'ERRO: sem folha de caminhada para {sorted(faltando)}. '
                         'É dela que sai a escala do personagem.')

    referencia = min(ref_por_heroi.values())
    print('\nrégua por personagem (ombro ao pé na caminhada):')
    for h, v in sorted(ref_por_heroi.items()):
        print(f'   {h}: {v} px  ->  escala {referencia / v:.3f}')
    print(f'referência: {referencia} px (a menor — reduzir preserva o desenho, '
          f'ampliar pixel art inventa pixel)')

    # ── PARADO E CAMINHADA TÊM DE MEDIR IGUAL ───────────────────────────────────────
    #
    # A escala é uma por PERSONAGEM, tirada da caminhada — e isso basta quando as folhas
    # vêm todas do mesmo desenho. Não foi o caso do Huans: a folha de parado saiu com o
    # corpo 6,8% maior que a de caminhada (173 contra 162 de ombro ao pé). Como as duas
    # recebem o mesmo `corpo` na ficha, o jogo desenhava as duas na mesma escala e o herói
    # ficava VISIVELMENTE maior parado do que andando — e ele troca entre as duas o tempo
    # todo, então o defeito aparece a cada passo.
    #
    # As folhas de GOLPE ficam de fora desta correção de propósito: nelas o corpo encolhe
    # porque o personagem agacha, e igualar isso apagaria a pose.
    for f in folhas:
        nome = Path(f['caminho']).name
        # SÓ A FOLHA DE PARADO. Ela é a que troca com a caminhada o tempo todo — a cada
        # passo dado e a cada tecla solta —, então uma diferença ali aparece o jogo
        # inteiro. A de GUARDA ficou de fora depois de medir: no Akles ela pediria
        # encolher e no Huans, crescer 32%, porque um fica de pé em guarda e o outro
        # agacha. Igualar as duas apagaria a pose de um dos dois.
        if '_parado' not in nome: continue
        ref = ref_por_heroi[dono(f['caminho'])]
        if not f['altura'] or not ref: continue
        k = ref / f['altura']
        if abs(k - 1) < 0.03: continue          # já casam: não mexe
        print(f"  {nome:34} corpo {f['altura']} -> {ref} (x{k:.3f})")
        f['quadros'] = [q if not q else
                        q.resize((max(1, round(q.width * k)), max(1, round(q.height * k))),
                                 Image.NEAREST)
                        for q in f['quadros']]
        f['altura'] = ref

    # Reescala e mede o maior quadro do conjunto inteiro, para a célula servir a todas.
    maxw = maxh = 0
    for f in folhas:
        f['escala'] = referencia / ref_por_heroi[dono(f['caminho'])]
        novos = []
        for q in f['quadros']:
            if not q:
                novos.append(None); continue
            if abs(f['escala'] - 1) > 0.001:
                nw = max(1, round(q.width * f['escala']))
                nh = max(1, round(q.height * f['escala']))
                q = q.resize((nw, nh), Image.NEAREST)   # NEAREST: borda dura de pixel art
            novos.append(q)
            maxw = max(maxw, q.width); maxh = max(maxh, q.height)
        f['quadros'] = novos

    # ALTURA comum, LARGURA por folha. A folha de ataque é muito mais larga que as
    # outras porque o rastro da espada se estende para o lado; forçar todas na largura
    # dela deixaria caminhada e parado com metade da célula vazia. O que precisa casar é
    # a altura e a linha dos pés — com elas iguais, o desenho pode calcular a largura
    # pela proporção da própria folha e o personagem sai do mesmo tamanho em todas.
    CH = maxh + MARGEM * 2
    print(f'altura de célula comum: {CH}\n')

    for f in folhas:
        nc, nl = f['cols'], f['lins']
        CW = max(q.width for q in f['quadros'] if q) + MARGEM * 2
        folha = Image.new('RGBA', (CW * nc, CH * nl), (0, 0, 0, 0))
        for i, q in enumerate(f['quadros']):
            if not q:
                continue
            ci, li = i % nc, i // nc
            x = ci * CW + (CW - q.width) // 2
            y = li * CH + (CH - MARGEM) - q.height   # pés na mesma linha, em TODAS as folhas
            folha.paste(q, (x, y), q)
        folha.save(f['caminho'])
        print(f"{Path(f['caminho']).name:34} {folha.width}x{folha.height} · "
              f"célula {CW}x{CH} · escala {f['escala']:.3f} · proporção {CW/CH:.3f}")

    # Ficha de medidas. Sem ela o motor teria que desenhar pela CÉLULA, e a célula é
    # mais alta que o personagem para caber a espada erguida do golpe vertical: o herói
    # sairia com metade do tamanho justamente nessa folha. Com `corpo` e `base` o desenho
    # escala pelo CORPO e ancora a linha dos PÉS, então toda folha nova entra certa sem
    # ninguém ajustar número na mão.
    ficha = {}
    for f in folhas:
        CW = max(q.width for q in f['quadros'] if q) + MARGEM * 2
        ficha[Path(f['caminho']).name] = {
            'cols': f['cols'], 'rows': f['lins'],
            'celula': [CW, CH],
            'corpo': round(ref_por_heroi[dono(f['caminho'])] * f['escala']),  # ombro→pé
            'base': CH - MARGEM,                          # onde estão os pés na célula
        }
    destino = Path(folhas[0]['caminho']).parent / 'achilles_folhas.json'
    destino.write_text(json.dumps(ficha, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f'\nficha de medidas: {destino}')
    print('  o desenho escala pelo CORPO e ancora os PÉS, não pela célula.')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('uso: casar_folhas_heroi.py <arquivo.png:colunas:linhas> [...]')
        sys.exit(1)
    main(sys.argv[1:])
