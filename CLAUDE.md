# Acordelot Engine — contexto do projeto

RPG de pixel art no navegador para educação musical. HTML/CSS/JS puro, sem framework e
sem build de bundler. Alvo principal: **celular em paisagem**. O dono do projeto é dono de
escola de música — **teoria musical tem que estar correta**, sempre.

## Como rodar

```bash
python3 server.py            # porta 8085
```

- Editor: `http://localhost:8085/index.html`
- Jogo (build endurecida): `http://localhost:8085/dist/index.html`
- Jogo com banca de testes: `.../dist/index.html?banca=1` — carteira e material cheios,
  **save separado** (`acordelot_player_v1_banca`), então testar não suja a partida limpa.

## Antes de commitar: rodar as três ferramentas

Elas existem porque cada uma nasceu de um bug que só apareceu no playtest do dono.
Rodar as três leva segundos e evita fazer ele descobrir por você.

```bash
python3 ferramentas/auditar_cenas.py     # cenas, NPCs, mapas, comandos, tipos de objetivo
python3 ferramentas/simular_capitulo.py  # a corrente do capítulo fecha?
python3 ferramentas/alcance.py           # o jogador consegue CHEGAR onde a história pede?
./build.sh                               # monta o dist/ com carimbo por hash
```

## Arquitetura em uma tela

- **`game.js`** (~21 mil linhas) é o motor inteiro: render, combate, editor, cenas, HUD.
- **`index.html`** é o EDITOR. **`dist/index.html`** é a build de jogo, **arquivo separado
  e mantido à mão**. Mexer só no primeiro não chega ao jogo publicado — já custou caro.
- `build.sh` copia `game.js`, `style.css` e `assets/` para o `dist/` e carimba os `?v=`
  com hash de conteúdo. **Não** copia `index.html`.
- Cenas são JSON em `assets/cutscenes/`, listadas em `index.json`. Missões em
  `assets/quests/quests.json`. Diálogos em `assets/dialogues/`.

## Armadilhas que já morderam (não repetir)

1. **`outdoors` não roda em todos os modos.** Lógica de jogo posta nesse ramo de render
   silenciosamente nunca executa. Ponha no topo de `loop()`/`quadro()`.
2. **O save guarda a missão INTEIRA**, objetivos inclusive. Corrigir o `quests.json` não
   alcança quem já tem a missão aberta — existe `migrarMissaoSalva` para isso.
3. **Objetivo sem `type`, ou com `type` que nenhum código emite, nunca conclui.** O motor
   lê `type` + `item`/`npc`. Os tipos válidos são os que aparecem em
   `progressoDeMissao('...')`. O `auditar_cenas.py` confere isso.
4. **Ordem das cenas é prioridade.** Duas cenas no mesmo gatilho (falar com o Antony) e a
   primeira da lista ganha. Use o campo `prioridade` (menor = ouvida antes).
5. **`esperarPerto` com o controle desligado é impasse.** Existe cão de guarda com prazo,
   mas prefira mandar o NPC andar até o jogador (`andar` com `para: "jogador"`).
6. **Uma exceção dentro do `requestAnimationFrame` acumulava transformação** e a tela
   aproximava até ficar preta, escondendo o erro. Hoje a matriz é zerada por quadro e o
   primeiro erro aparece escrito na tela.
7. **O painel do navegador suspende o rAF quando oculto.** Leituras de teste ficam
   congeladas; screenshot acorda. Não conclua "travou" a partir disso.
8. **Cenário fora do `gridPos` é ilha** — existe e ninguém chega nele. Rodar `alcance.py`.
9. **Cache**: os `?v=` eram fixos e o navegador servia `game.js` velho de forma
   intermitente. Sempre usar `./build.sh`, nunca copiar à mão.

## Sprites

Folhas do herói: uma por estado, com `assets/personagens/herois/achilles_folhas.json`
trazendo `cols`, `rows`, `celula`, **`corpo`** (altura do corpo em pixels) e **`base`**
(linha dos pés). O desenho escala por `pH / corpo` e ancora os pés. **`corpo` errado faz o
herói mudar de tamanho ao trocar de estado** — se desconfiar, meça o alfa da célula em vez
de chutar.

Recorte por chroma magenta: `mag = min(R,B) − G`, limite 55–60, depois erosão de 1px
(`MinFilter(3)`) para matar a franja roxa.

## Duas armadilhas de sistema, das que custam mais caro

**Registro duplo com nomes parecidos.** `acordesObtidos` é por GRAU e alimenta a tela
antiga da bigorna; `acordesPossuidos` é por ID e é o que a Composição lê. A forja escrevia
no primeiro: o jogador fechava a escala e não tinha acorde nenhum para equipar, sem erro
nenhum no console. Antes de escrever num registro, confira quem o LÊ.

**Função definida e nunca chamada.** A fazenda inteira (`regar`, `colher`,
`estagioDaPlanta`, `alimentarEco`, `comprarExpansao`) existia escrita e ninguém a chamava.
Código que não é chamado não aparece em nenhuma ferramenta e passa por pronto. Ao terminar
um sistema, procure o `grep` que prova que alguém o invoca.

**Relógio de jogo é `Date.now()`, nunca `performance.now()`.** O segundo conta desde que a
ABA abriu e zera a cada carregamento: o Abeto de doze horas, que existe para ser plantado
antes de dormir, não tinha como crescer.

## Estado atual

Capítulo 1 inteiro escrito (21 cenas), com trilha sintetizada, acordes por campo harmônico
(nove equipáveis em três compassos, com evolução em cinco níveis), dungeons, equipamentos,
progressão por herói e fazenda funcionando. O `alcance.py` fecha: **tudo que a história
pede é alcançável.**

O laço da economia fecha assim: capturar Eco na Clareira dá a **Alma** daquela nota →
cinco almas da mesma nota invocam um Eco na fazenda → o Eco come o que a fazenda planta e
devolve fragmento → o fragmento sobe acorde. Nenhuma etapa aceita moeda genérica.

Falta:

- **Arte da Alma de Eco** — hoje é um `✦` com o nome da nota. São sete (uma por nota).
- **Ilhas que sobraram** (nenhuma cena ou missão pede): Notas Sagradas, Academia de
  Música, Centro de Acordelot, e duas sobras do Salão do Forjador.
- **Pipo** desvia de obstáculo localmente, mas não busca caminho: trava em beco.
- **Atributo só sobe com Partitura**, e Partitura cai em dungeon e captura de Eco. Quem só
  segue o capítulo chega ao altar com os cinco atributos em zero.
- As duas Florestas Sombrias novas estão **sem monstro** — o dono posiciona.
- Os dois cenários novos de floresta vieram **noturnos**, contra a regra do
  `PROMPT_CENARIOS.md`; para a Floresta Sombria isso combina, mas não dá para clarear.
- `SELETOR_DE_CENA_LIGADO` e `BANCA_DE_TESTES` são de teste: desligar antes de publicar
  para jogador.

## Peso do repositório

O `dist/` está versionado (1016 arquivos, ~431 MB) e o `.git` passa de 550 MB. Clonar
demora, e cada build re-adiciona binário grande. Tirar o `dist/` do histórico reescreve o
histórico — **decisão do dono**, não fazer sem pedir.

## Como o dono trabalha

Ele testa no celular, em guia anônima, e relata o que quebrou. Prefere que o problema seja
encontrado antes por ferramenta a descobrir jogando. Quando ele diz que algo "não está
funcionando", **medir antes de teorizar** — as três ferramentas e uma leitura no navegador
resolvem mais rápido que dedução.
