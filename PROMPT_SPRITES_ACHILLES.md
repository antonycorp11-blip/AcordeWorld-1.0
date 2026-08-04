# Prompt para gerar a folha de caminhada do Achilles

## O que está errado na folha atual

Os 8 quadros de cada direção são **poses paradas quase iguais** — só o braço muda um
pouco. Não há ciclo de caminhada: nenhuma perna passa pela outra, não há passada, não
há balanço do corpo. É por isso que o personagem parece deslizar em vez de andar.

Um ciclo de caminhada precisa de **poses distintas e específicas**, não de variações
sutis da mesma pose. É isso que o prompt abaixo pede explicitamente.

## Formato que o motor espera (não mude)

- Folha única, **8 colunas × 4 linhas** = 32 quadros
- Ordem das linhas, de cima para baixo: **frente (para o jogador) · costas · esquerda · direita**
- Célula de **131 × 227 px** → folha de **1048 × 908 px**
- Fundo **transparente** (ou branco puro, que eu recorto)
- Pés de todos os quadros na **mesma linha de chão**

---

## PROMPT (copie daqui para baixo)

Sprite sheet de caminhada para RPG 2D em vista de cima 3/4, estilo pixel art 16-bit
(SNES, tipo Secret of Mana / Stardew Valley). Fundo totalmente transparente.

PERSONAGEM: jovem espadachim, cabelo castanho volumoso e bagunçado, olhos castanhos,
armadura de couro marrom com peitoral e ombreiras de metal escuro, capa/echarpe azul
royal caindo do ombro esquerdo, botas marrons de cano médio, cinto com fivela. Mesma
identidade visual em todos os 32 quadros — mesmas cores, mesmo volume de cabelo, mesma
altura, mesma espessura de contorno.

GRADE: exatamente 8 colunas por 4 linhas, 32 quadros no total, células de tamanho
idêntico, sem moldura, sem numeração, sem texto, sem grade desenhada, sem sombra
projetada no chão.

LINHA 1 — caminhando DE FRENTE (rosto voltado para quem olha)
LINHA 2 — caminhando DE COSTAS (nuca voltada para quem olha)
LINHA 3 — caminhando para a ESQUERDA (perfil completo, virado à esquerda)
LINHA 4 — caminhando para a DIREITA (perfil completo, virado à direita)

CICLO DE CAMINHADA — as 8 poses de cada linha, nesta ordem exata:
1. contato: perna DIREITA à frente esticada tocando o chão com o calcanhar, perna
   esquerda atrás esticada com o pé saindo do chão, braços em oposição (braço esquerdo
   à frente, direito atrás), corpo no ponto mais alto
2. amortecimento: peso descendo sobre a perna direita, joelho direito dobrado, corpo no
   ponto mais BAIXO do ciclo, perna esquerda passando
3. passagem: perna esquerda passa ao lado da direita, joelho esquerdo erguido, pernas
   quase juntas, braços quase paralelos ao corpo, corpo subindo
4. impulso: perna direita empurra o chão com a ponta do pé, corpo no ponto mais ALTO,
   perna esquerda estendendo para a frente
5. contato espelhado: perna ESQUERDA à frente esticada tocando o chão, direita atrás,
   braços trocados (braço direito à frente, esquerdo atrás)
6. amortecimento espelhado: peso sobre a perna esquerda, joelho esquerdo dobrado, corpo
   no ponto mais baixo
7. passagem espelhada: perna direita passa ao lado da esquerda, joelho direito erguido,
   pernas quase juntas
8. impulso espelhado: perna esquerda empurra o chão, corpo no ponto mais alto, direita
   estendendo para a frente

O quadro 8 tem que encadear no quadro 1 sem salto — é um ciclo fechado que vai repetir
sem parar.

MOVIMENTO OBRIGATÓRIO EM CADA QUADRO: as pernas mudam de posição de forma clara e
visível entre um quadro e o próximo; os braços balançam em oposição às pernas; o corpo
sobe e desce cerca de 3 a 4 pixels ao longo do ciclo; a capa azul e o cabelo têm um
atraso de 1 quadro em relação ao corpo, arrastando para trás no impulso. NÃO faça 8
variações da mesma pose parada — cada quadro é uma fase diferente da passada.

NAS LINHAS 3 e 4 (perfil): a perna de trás aparece mais escura que a da frente, para
separar as duas; o braço de trás também mais escuro. A passada em perfil é a que mais
mostra amplitude — perna da frente bem à frente, perna de trás bem atrás.

TÉCNICO: contorno escuro consistente de 1 pixel, sombreado em blocos chapados (cel
shading), no máximo 3 tons por material, luz vindo de cima e um pouco da esquerda,
SEM anti-aliasing, SEM desfoque, SEM gradiente suave, SEM brilho externo, SEM sombra
no chão. Personagem centralizado horizontalmente em cada célula, ocupando cerca de 80%
da altura da célula, com os PÉS DE TODOS OS 32 QUADROS ALINHADOS NA MESMA ALTURA.

---

## Se a ferramenta não der conta da folha inteira de uma vez

Gere **uma linha por vez** (4 imagens de 8 quadros em fila horizontal), repetindo o
bloco PERSONAGEM e o bloco CICLO DE CAMINHADA em cada uma, e trocando só a linha da
direção. Depois me mande as 4 imagens que eu monto a folha alinhada com
`ferramentas/normalizar_heroi.py`, que já detecta as faixas, recorta pelo conteúdo e
põe os pés na mesma linha de base.

## Extra, quando a caminhada estiver boa

Vale gerar depois, no mesmo formato e com a mesma identidade:

- **Parado (idle)**: 4 quadros por direção — respiração leve, capa e cabelo com balanço
  mínimo. Sem isto o personagem congela num quadro seco quando você solta a tecla.
- **Ataque**: 6 quadros por direção — recuo, giro do tronco, golpe com extensão máxima
  do braço, recuperação. Hoje o motor sabe usar uma linha de ataque, mas a folha atual
  não tem nenhuma.
