#!/usr/bin/env python3
"""
UM comando para aplicar folhas de sprite do herói.

Antes eram três passos, repetidos folha a folha: recortar cada uma, casar todas na mesma
escala, e ainda lembrar de reprocessar as antigas junto — porque a régua sai do conjunto,
e processar uma sozinha desalinha as outras. Errar a ordem custava rodar tudo de novo.

Aqui basta apontar as folhas novas. O script:
  1. guarda o original em assets/folhas_originais/ (para reprocessar sem pedir de novo);
  2. descobre a grade sozinho, se não for informada;
  3. recorta e limpa o fundo magenta;
  4. recorta TAMBÉM as folhas já aplicadas, dos originais guardados;
  5. casa o conjunto inteiro na mesma escala e linha de pés;
  6. grava a ficha de medidas que o motor lê.

    python3 ferramentas/aplicar_folhas_heroi.py "minha folha.png:ataque:6:4"
    python3 ferramentas/aplicar_folhas_heroi.py "outra.png:corrida"      # grade automática
"""
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
ORIG = RAIZ / 'assets/folhas_originais'
DEST = RAIZ / 'assets/personagens/herois'
FERR = Path(__file__).resolve().parent


GRADES = ORIG / 'grades.json'


def grades_salvas():
    """A grade de cada folha fica GRAVADA, não adivinhada.

    A primeira versão contava corredores de fundo para descobrir colunas e linhas — e
    errou em cinco das sete folhas, porque o rastro da espada atravessa a fresta entre
    células e cola uma na outra. O resultado foram folhas recortadas em 3x5 e 5x5,
    picadas no meio do personagem. Adivinhar aqui é barato de escrever e caro de errar:
    informar a grade uma vez custa dois números, e nunca mais precisa ser lembrada.
    """
    if GRADES.exists():
        return json.loads(GRADES.read_text(encoding='utf-8'))
    return {}


def gravar_grade(nome, cols, lins):
    g = grades_salvas()
    g[nome] = [cols, lins]
    GRADES.parent.mkdir(parents=True, exist_ok=True)
    GRADES.write_text(json.dumps(g, indent=2, ensure_ascii=False), encoding='utf-8')


def main(pedidos):
    aplicadas = []
    for pedido in pedidos:
        partes = pedido.split(':')
        arquivo, nome = partes[0], partes[1]
        salvas = grades_salvas()
        if len(partes) >= 4:
            cols, lins = int(partes[2]), int(partes[3])
        elif nome in salvas:
            cols, lins = salvas[nome]
            print(f'{nome}: grade {cols}x{lins} (já registrada)')
        else:
            sys.exit(f'ERRO: informe a grade da folha "{nome}" — '
                     f'ex.: "{arquivo}:{nome}:6:4". Adivinhar a grade errou em cinco de '
                     f'sete folhas e picou o personagem no meio; agora ela é obrigatória '
                     f'na primeira vez e fica registrada para as próximas.')
        gravar_grade(nome, cols, lins)
        ORIG.mkdir(parents=True, exist_ok=True)
        guardado = ORIG / f'achilles_{nome}_original.png'
        if Path(arquivo).resolve() != guardado.resolve():
            shutil.copy(arquivo, guardado)
        aplicadas.append((nome, cols, lins))

    # Todas as folhas já existentes entram no casamento: a régua sai do conjunto, então
    # processar só as novas desalinharia as antigas.
    conhecidas = dict((n, (c, l)) for n, c, l in aplicadas)
    for orig in sorted(ORIG.glob('achilles_*_original.png')):
        nome = re.sub(r'^achilles_|_original\.png$', '', orig.name)
        if nome in conhecidas:
            continue
        salvas = grades_salvas()
        if nome not in salvas:
            print(f'  aviso: folha "{nome}" sem grade registrada — ficou de fora')
            continue
        conhecidas[nome] = tuple(salvas[nome])

    print()
    for nome, (cols, lins) in conhecidas.items():
        subprocess.run([sys.executable, str(FERR / 'recortar_folha_heroi.py'),
                        str(ORIG / f'achilles_{nome}_original.png'),
                        str(DEST / f'achilles_{nome}.png'), str(cols), str(lins)],
                       check=True, stdout=subprocess.DEVNULL)
        print(f'  recortada: achilles_{nome}.png ({cols}x{lins})')

    print()
    args = [f'{DEST}/achilles_{n}.png:{c}:{l}' for n, (c, l) in conhecidas.items()]
    subprocess.run([sys.executable, str(FERR / 'casar_folhas_heroi.py')] + args, check=True)

    print('\nPara ligar uma folha nova no jogo, acrescente a linha em HERO_DEFINITIONS:')
    for nome in conhecidas:
        print(f"      {nome+':':11} {{ src: 'assets/personagens/herois/achilles_{nome}.png' }},")


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    main(sys.argv[1:])
