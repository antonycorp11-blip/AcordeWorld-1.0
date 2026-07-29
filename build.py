#!/usr/bin/env python3
"""
Gera dist/ — a versão publicável do jogo, sem editor.

Por que existe: o editor grava por HTTP num servidor Python local. No GitHub Pages não
há servidor, então tudo que é edição precisa sair do build e todo o estado atual precisa
ir congelado como arquivo estático. Rode isto sempre que quiser publicar.

    python3 build.py

O resultado em dist/ é auto-contido: dá para subir a pasta inteira para o GitHub Pages,
Netlify ou qualquer hospedagem estática.
"""
import json
import re
import time
import shutil
import sys
from pathlib import Path

RAIZ = Path(__file__).parent
DIST = RAIZ / 'dist'

# Blocos de UI que só existem para editar. Removidos do HTML publicado para que ninguém
# consiga abrir o editor no build dos alunos, nem por URL.
IDS_EDITOR = [
    'engine-header',
    'left-sidebar',          # barra lateral do Editor de Cenários
    'signpostWizardOverlay',
    'dialogueEditorOverlay',
]

# Pastas e arquivos de assets que o jogo realmente carrega.
ASSETS_INCLUIR = ['cutscenes', 'dialogues', 'icons', 'monsters', 'props', 'quests', 'skins']
EXT_ASSET = {'.jpg', '.jpeg', '.png', '.mp4', '.json', '.webp', '.ogg', '.mp3'}

# Referências que existem no código mas cujo arquivo pode não estar na pasta.
# Não são erro: o jogo tem reserva para todas.
OPCIONAIS = {'shop_interior.png', 'coin.png', 'inventory.png', 'frame.png'}


def remove_bloco_por_id(html: str, elem_id: str) -> str:
    """Remove a tag (e todo o seu conteúdo) cujo id seja `elem_id`, contando aninhamento."""
    m = re.search(rf'<(\w+)([^>]*\bid="{re.escape(elem_id)}"[^>]*)>', html)
    if not m:
        return html
    tag = m.group(1)
    ini = m.start()
    # Tag vazia no formato <div ... />
    if m.group(0).rstrip().endswith('/>'):
        return html[:ini] + html[m.end():]
    prof = 0
    pos = ini
    padrao = re.compile(rf'<{tag}\b|</{tag}>', re.I)
    while True:
        achou = padrao.search(html, pos)
        if not achou:
            return html  # HTML malformado: melhor não mexer
        prof += 1 if achou.group(0)[1] != '/' else -1
        pos = achou.end()
        if prof == 0:
            return html[:ini] + html[pos:]


def construir_html() -> str:
    html = (RAIZ / 'index.html').read_text(encoding='utf-8')
    for elem_id in IDS_EDITOR:
        html = remove_bloco_por_id(html, elem_id)

    # Marca de versão em cada deploy. Sem isto o celular de um aluno que já abriu o
    # jogo continua rodando o game.js e o style.css antigos por dias, e a impressão
    # é de que a atualização não foi publicada.
    versao = time.strftime('%Y%m%d%H%M%S')

    # config.js precisa vir antes de game.js para a flag existir na avaliação do módulo.
    html = html.replace(
        '<script src="game.js"></script>',
        f'<script src="config.js?v={versao}"></script>\n<script src="game.js?v={versao}"></script>'
    )
    html = html.replace('href="style.css"', f'href="style.css?v={versao}"')
    html = html.replace('<title>Acordelot Engine — Reino da Música</title>',
                        '<title>Acordelot — Reino da Música</title>')
    return html


def copiar_assets() -> tuple[int, list[str]]:
    destino = DIST / 'assets'
    destino.mkdir(parents=True, exist_ok=True)
    origem = RAIZ / 'assets'
    n = 0
    for item in origem.iterdir():
        if item.is_dir():
            if item.name in ASSETS_INCLUIR:
                shutil.copytree(item, destino / item.name, dirs_exist_ok=True)
                n += sum(1 for _ in (destino / item.name).rglob('*') if _.is_file())
        elif item.suffix.lower() in EXT_ASSET:
            shutil.copy2(item, destino / item.name)
            n += 1

    # Confere se todo cenário declarado no config tem o arquivo correspondente.
    faltando = []
    faltando_cenas = []
    # Cenas: o índice manda, e cada id precisa ter o JSON copiado.
    idx = origem / 'cutscenes' / 'index.json'
    if idx.exists():
        for cid in (json.loads(idx.read_text(encoding='utf-8')).get('cenas') or []):
            if not (destino / 'cutscenes' / f'{cid}.json').exists():
                faltando_cenas.append(f'cena "{cid}" → assets/cutscenes/{cid}.json')

    cfg = json.loads((origem / 'acordelot_world_config.json').read_text(encoding='utf-8'))
    for chave, caminho in (cfg.get('bgSources') or {}).items():
        if not (DIST / caminho).exists():
            faltando.append(f'cenário "{chave}" → {caminho}')
    return n, faltando + faltando_cenas


def main() -> int:
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()

    (DIST / 'index.html').write_text(construir_html(), encoding='utf-8')
    shutil.copy2(RAIZ / 'game.js', DIST / 'game.js')
    shutil.copy2(RAIZ / 'style.css', DIST / 'style.css')
    (DIST / 'config.js').write_text(
        '// Gerado por build.py — marca esta cópia como build de jogo (sem editor).\n'
        "window.ACORDELOT_BUILD = 'play';\n", encoding='utf-8')
    # GitHub Pages ignora pastas iniciadas por _ sem isto.
    (DIST / '.nojekyll').write_text('', encoding='utf-8')

    n_assets, faltando = copiar_assets()

    tam = sum(f.stat().st_size for f in DIST.rglob('*') if f.is_file())
    print(f'dist/ gerado — {n_assets} assets, {tam/1024/1024:.1f} MB')
    print('  editor removido, gravação no servidor desligada')
    if faltando:
        print('\n⚠️  cenários sem arquivo (o jogo abre, mas o mapa fica preto):')
        for f in faltando:
            print(f'   {f}')
    print('\nTeste local:  cd dist && python3 -m http.server 8086')
    return 0


if __name__ == '__main__':
    sys.exit(main())
