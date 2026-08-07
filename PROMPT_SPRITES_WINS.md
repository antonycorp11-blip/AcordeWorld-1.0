# Wins — folhas de caminhada e ataque

Duas folhas por enquanto: **caminhada** e **ataque**.

A arte da personagem já existe na ferramenta, então estes prompts **não descrevem cor,
roupa nem penteado** — descrever competiria com a referência e o gerador acabaria
inventando uma terceira versão. O que os prompts especificam é só o que a referência não
tem: a GRADE, as DIREÇÕES, as FASES do movimento e as regras técnicas de recorte.

**Anexe a arte da Wins como imagem de referência em toda geração.** É ela que manda na
aparência.

## O que aprendemos com o Achilles e vale aqui

1. **Fundo magenta puro `#FF00FF`.** Foi o que resolveu o recorte: branco existe no
   personagem e existia no fundo, então separar era adivinhação. Com magenta, zero resíduo.
2. **As quatro linhas têm que ser quatro direções DE VERDADE.** A primeira folha de ataque
   do Achilles saiu com as quatro na mesma pose e foi perdida.
3. **Nada pode ultrapassar a borda da célula** — nem a lança, nem a onda, nem o cabelo.
   Foi isso que quebrou a detecção de grade e picou a folha ao meio.
4. **Pés de todos os quadros na mesma altura.**

---

## BLOCO DE PERMANÊNCIA — repita sem alterar, nas DUAS folhas

PERSONAGEM: exatamente a personagem da imagem de referência, sem alterar nada da
aparência dela — mesmo rosto, mesmo cabelo, mesma roupa, mesmas cores, mesmos acessórios.
Não redesenhe, não reinterprete e não modernize: só coloque ESSA personagem nas poses
pedidas. A arma é a mesma lança-microfone da referência, com o mesmo formato de haste e a
mesma cabeça de microfone na ponta.
ESTILO: pixel art 16-bit (SNES, tipo Secret of Mana / Chrono Trigger), vista de cima em
3/4, contorno escuro consistente de 1 pixel, sombreado em blocos chapados, luz vindo de
cima e um pouco da esquerda.
PROIBIDO: anti-aliasing, desfoque, gradiente suave, brilho externo, sombra projetada no
chão, moldura, texto, numeração, grade desenhada, borda em volta dos quadros.
FUNDO: magenta puro #FF00FF, chapado, sem variação, sem ruído, sem degradê.
CONSISTÊNCIA: a MESMA personagem em todos os quadros — mesma altura, mesma proporção de
cabeça e corpo, mesma espessura de contorno, mesmas cores da referência do primeiro ao
último quadro.
ENQUADRAMENTO: personagem centralizada horizontalmente em cada célula, ocupando cerca de
80% da altura. PÉS DE TODOS OS QUADROS ALINHADOS NA MESMA ALTURA — ela não pode subir e
descer entre um quadro e outro. NADA pode ultrapassar a borda da célula.

---

## FOLHA 1 — CAMINHADA · 8 colunas × 4 linhas

Sprite sheet de CAMINHADA para RPG 2D em vista de cima 3/4, pixel art 16-bit. Grade de
exatamente 8 colunas por 4 linhas, 32 quadros. A lança é carregada apoiada no ombro,
apontando para trás e para cima, em todos os quadros.

### AS QUATRO LINHAS SÃO QUATRO DIREÇÕES DIFERENTES
**LINHA 1 — DE FRENTE.** Encara quem olha. Vê-se o ROSTO INTEIRO: dois olhos, nariz,
boca. Vê-se a frente do corpo.
**LINHA 2 — DE COSTAS.** NÃO SE VÊ O ROSTO — vê-se a nuca e as costas dela, com o cabelo
por trás.
**LINHA 3 — PERFIL PARA A ESQUERDA.** Corpo de lado, virada para a esquerda da imagem.
Vê-se UM olho só e a linha do nariz recortada contra o fundo. Um ombro à frente do outro.
**LINHA 4 — PERFIL PARA A DIREITA.** Espelho da linha 3, virada para a direita.
Se duas linhas quaisquer ficarem parecidas, a folha está errada. De frente, de costas e de
perfil são silhuetas completamente diferentes, não variações da mesma pose.

### CICLO — as 8 poses de cada linha, nesta ordem
1. **contato**: perna direita à frente esticada tocando o chão com o calcanhar, esquerda
   atrás esticada com o pé saindo do chão, braço livre em oposição, corpo no ponto mais alto
2. **amortecimento**: peso descendo sobre a perna direita, joelho direito dobrado, corpo
   no ponto mais BAIXO, perna esquerda passando
3. **passagem**: perna esquerda passa ao lado da direita, joelho erguido, pernas quase
   juntas, corpo subindo
4. **impulso**: perna direita empurra o chão com a ponta do pé, corpo no ponto mais ALTO,
   perna esquerda estendendo para a frente
5 a 8: as mesmas quatro poses ESPELHADAS, trocando a perna e invertendo o braço livre.

O quadro 8 encadeia no 1 sem salto — é um ciclo fechado que repete sem parar.
OBRIGATÓRIO: as pernas mudam de posição de forma clara entre um quadro e o próximo; o
corpo sobe e desce 3 a 4 pixels ao longo do ciclo; o cabelo e as partes soltas da roupa
têm atraso de 1 quadro em relação ao corpo, arrastando para trás no impulso. NÃO faça 8
variações da mesma pose parada — cada quadro é uma fase diferente da passada.
NAS LINHAS 3 e 4 (perfil): perna e braço de trás mais escuros que os da frente, para
separar os dois lados. É em perfil que a amplitude da passada mais aparece.

---

## FOLHA 2 — ATAQUE COM A LANÇA · 6 colunas × 4 linhas

Sprite sheet de ATAQUE para RPG 2D em vista de cima 3/4, pixel art 16-bit. Grade de
exatamente 6 colunas por 4 linhas, 24 quadros. Ela ataca com uma ESTOCADA CANTADA: puxa a
lança, avança, e o microfone da ponta solta uma onda de som.

### AS QUATRO LINHAS SÃO QUATRO DIREÇÕES DIFERENTES
As mesmas quatro descrições da folha de caminhada — rosto inteiro de frente, nuca de
costas, um olho só em cada perfil. O golpe sempre aponta para a direção que ela encara: na
linha 1 vem para a frente e para baixo, na linha 2 para longe de quem olha, e nas linhas 3
e 4 para os lados.

### AS 6 FASES DE CADA LINHA
1. **preparação**: recua o tronco, puxa a lança junto ao corpo com as duas mãos, o
   microfone perto do rosto como se fosse cantar, peso na perna de trás, joelhos dobrados
2. **inspiração**: peito aberto, cabeça levemente para trás, boca abrindo, o microfone
   começando a brilhar — corpo esticado, o oposto do quadro seguinte
3. **estocada**: braços e corpo em EXTENSÃO MÁXIMA para a frente, perna da frente bem
   avançada quase num afundo, lança apontando reta, corpo formando uma linha diagonal única
   do pé de trás à ponta do microfone. Quadro mais dramático da folha.
4. **onda de som**: mesma extensão, e à frente do microfone três arcos concêntricos
   claros — um anel de som se abrindo. Cabelo e roupa arrastando para trás.
5. **recuperação**: braços recolhendo, lança voltando para junto do corpo, peso voltando
   ao centro
6. **volta à guarda**: quase parada, joelhos levemente flexionados, lança apoiada no ombro
   como na caminhada, pronta para repetir

### ONDA DE SOM
Nos quadros 4 e 5, os arcos concêntricos são desenhados em pixel art CHAPADA — contorno de
forma, não brilho difuso. Sem desfoque, sem transparência suave, sem gradiente.
**A ONDA NÃO PODE ULTRAPASSAR A BORDA DA CÉLULA.** Ela tem que caber inteira dentro do
quadro a que pertence, com folga vazia em volta. Se invadir o quadro vizinho, o recorte
automático quebra a folha.

A silhueta muda MUITO entre um quadro e o próximo — o quadro 2 é o corpo mais esticado
para cima e o 3 o mais projetado para a frente. Golpe que não deforma a silhueta não lê
como golpe.

---

## Se a ferramenta não der conta das 4 linhas de uma vez

Gere **uma linha por vez**, sempre com a arte de referência anexada, repetindo o BLOCO DE
PERMANÊNCIA e as fases, e trocando só a direção. Nomeie com a direção:

- `wins_caminhada_frente.png`, `_costas`, `_esquerda`, `_direita`
- `wins_ataque_frente.png`, `_costas`, `_esquerda`, `_direita`

## Como conferir antes de mandar

**Dá para dizer a direção de cada linha sem ler a legenda?** Na linha 2 dá para ver que ela
está de costas? Na 1 vê-se o rosto inteiro? **E ela continua sendo a mesma personagem da
referência em todos os 32 quadros?** Se qualquer resposta for não, gere de novo — é mais
rápido que eu processar e devolver o problema.

## O que eu faço quando chegar

```bash
python3 ferramentas/aplicar_folhas_heroi.py "wins caminhando.png:wins_caminhada:8:4" \
                                            "wins ataque.png:wins_ataque:6:4"
```
Recorta o magenta, alinha os pés, casa a escala com as folhas do Achilles e grava a ficha
de medidas. Depois eu ligo a Wins no elenco com a mesma estrutura dele — folha por estado
e quadro de descanso medido — e ela entra na troca de personagem pela tecla 2.
