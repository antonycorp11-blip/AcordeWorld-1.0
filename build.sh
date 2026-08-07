#!/bin/bash
# Monta o dist/ (a build que os jogadores recebem) a partir da raiz.
#
# Existe por dois motivos que já custaram caro:
#  1. O dist/ era cópia manual, e cenas reescritas ficaram no ar com o texto velho.
#  2. O index.html carimbava ?v= com uma data FIXA. Como a URL não mudava, o navegador
#     servia o game.js antigo por tempo indeterminado — inclusive uma versão com a banca
#     de testes ligada. Agora o carimbo é o hash do conteúdo: muda o arquivo, muda a URL.
set -euo pipefail
cd "$(dirname "$0")"

cp game.js style.css dist/
rsync -a --delete assets/ dist/assets/

sel=$(md5 -q game.js | cut -c1-10)
sty=$(md5 -q style.css | cut -c1-10)
python3 - "$sel" "$sty" <<'PY'
import io, re, sys
js, css = sys.argv[1], sys.argv[2]
p = 'dist/index.html'
s = io.open(p, encoding='utf-8').read()
s = re.sub(r'game\.js\?v=[^"\']*',  'game.js?v='  + js,  s)
s = re.sub(r'style\.css\?v=[^"\']*','style.css?v=' + css, s)
io.open(p, 'w', encoding='utf-8').write(s)
print('carimbos: game.js=%s style.css=%s' % (js, css))
PY
echo "dist/ pronto"
