# Folhas de sprite do Achilles — prompts completos

Gere **uma folha por vez** e me mande. Eu monto, alinho os pés e ligo no motor.

---

## 0. Leia isto antes de gerar qualquer coisa

### O fundo NÃO pode ser branco

A folha atual tem 0,75% de pixels quase-brancos totalmente opacos, presos **entre as
mechas do cabelo** e em vãos parecidos. O recorte por borda não alcança bolsão fechado,
e distinguir "fundo branco" de "brilho branco na armadura" é adivinhação — por isso
ainda sobra sujeira.

Peça **fundo magenta puro `#FF00FF`**. Essa cor não existe em lugar nenhum do
personagem, então o recorte fica exato, inclusive nos vãos fechados. Se a ferramenta
insistir em fundo branco, peça pelo menos **fundo transparente (PNG com alfa)**. Branco
é a única opção que dá problema.

### Formato que o motor espera

- Folha única, quadros em grade regular, **sem moldura, sem numeração, sem texto**
- Ordem das linhas, sempre de cima para baixo:
  **1 frente · 2 costas · 3 esquerda · 4 direita**
- Célula de **131 × 227 px** (mantenha esta proporção; eu reescalo se vier diferente)
- Personagem centralizado na célula, ocupando ~80% da altura
- **Pés de todos os quadros na mesma linha de chão**

### Bloco BASE — repita em TODA folha, sem alterar uma palavra

> PERSONAGEM: jovem espadachim, cabelo castanho volumoso e bagunçado, olhos castanhos,
> armadura de couro marrom com peitoral e ombreiras de metal escuro, capa/echarpe azul
> royal caindo do ombro esquerdo, botas marrons de cano médio, cinto com fivela.
> ESPADA: lâmina reta de aço claro com brilho frio, guarda dourada em forma de clave de
> sol, cabo envolto em couro azul escuro, pomo dourado redondo.
> ESTILO: pixel art 16-bit (SNES, tipo Secret of Mana / Chrono Trigger), vista de cima
> em 3/4, contorno escuro consistente de 1 pixel, sombreado em blocos chapados no
> máximo 3 tons por material, luz vindo de cima e um pouco da esquerda.
> PROIBIDO: anti-aliasing, desfoque, gradiente suave, brilho externo, sombra projetada
> no chão, moldura, texto, numeração, grade desenhada.
> FUNDO: magenta puro #FF00FF, chapado, sem variação.
> CONSISTÊNCIA: mesma identidade em todos os quadros — mesmas cores, mesmo volume de
> cabelo, mesma altura, mesma espessura de contorno. Personagem centralizado em cada
> célula, PÉS DE TODOS OS QUADROS ALINHADOS NA MESMA ALTURA.

---

## 1. CAMINHADA — 8 colunas × 4 linhas (prioridade máxima)

> Sprite sheet de CAMINHADA. Grade de exatamente 8 colunas por 4 linhas, 32 quadros.
> LINHA 1 caminhando de frente · LINHA 2 de costas · LINHA 3 para a esquerda (perfil) ·
> LINHA 4 para a direita (perfil). Espada guardada na bainha no quadril esquerdo.
>
> [BLOCO BASE]
>
> CICLO — as 8 poses de cada linha, nesta ordem exata:
> 1. contato: perna DIREITA à frente esticada tocando o chão com o calcanhar, esquerda
>    atrás esticada com o pé saindo do chão, braços em oposição (esquerdo à frente),
>    corpo no ponto mais alto
> 2. amortecimento: peso descendo sobre a perna direita, joelho direito dobrado, corpo
>    no ponto mais BAIXO, perna esquerda passando
> 3. passagem: perna esquerda passa ao lado da direita, joelho esquerdo erguido, pernas
>    quase juntas, braços quase paralelos ao corpo, corpo subindo
> 4. impulso: perna direita empurra o chão com a ponta do pé, corpo no ponto mais ALTO,
>    perna esquerda estendendo para a frente
> 5 a 8: as mesmas quatro poses ESPELHADAS, trocando perna direita por esquerda e
>    invertendo os braços
>
> O quadro 8 encadeia no 1 sem salto — é um ciclo fechado que repete sem parar.
> OBRIGATÓRIO: as pernas mudam de posição de forma clara entre um quadro e o próximo;
> os braços balançam em oposição às pernas; o corpo sobe e desce 3 a 4 pixels ao longo
> do ciclo; a capa azul e o cabelo têm atraso de 1 quadro, arrastando para trás no
> impulso. NÃO faça 8 variações da mesma pose parada — cada quadro é uma fase diferente
> da passada.
> NAS LINHAS 3 e 4 (perfil): perna e braço de trás mais escuros que os da frente, para
> separar os dois lados. É em perfil que a amplitude da passada mais aparece.

## 2. PARADO (idle) — 4 colunas × 4 linhas

> Sprite sheet de PERSONAGEM PARADO respirando. Grade de 4 colunas por 4 linhas, 16
> quadros. Mesma ordem de direções. Espada na bainha.
>
> [BLOCO BASE]
>
> CICLO de respiração, 4 poses: 1 neutro · 2 peito subindo 1 pixel, ombros levemente
> erguidos · 3 ponto mais alto da inspiração · 4 descendo de volta ao neutro. O quadro 4
> encadeia no 1. A capa azul e as pontas do cabelo oscilam de leve, com 1 quadro de
> atraso em relação ao corpo. Os pés NÃO se movem. Movimento sutil — é o personagem
> vivo, não andando.

## 3. POSTURA DE COMBATE (espada na mão, parado) — 4 colunas × 4 linhas

> Sprite sheet de POSTURA DE GUARDA com a espada empunhada, personagem alerta e parado.
> Grade de 4 colunas por 4 linhas, 16 quadros. Mesma ordem de direções.
>
> [BLOCO BASE]
>
> POSE: joelhos levemente flexionados, peso baixo, espada empunhada com as duas mãos na
> diagonal à frente do corpo, ponta apontando para cima e para a frente, ombro esquerdo
> ligeiramente adiantado. Os 4 quadros são uma respiração tensa em ciclo fechado: o
> corpo sobe e desce 1 a 2 pixels, a ponta da lâmina oscila de leve, a capa ondula.
> LINHA 1 (frente): a lâmina cruza na diagonal, não pode esconder o rosto.
> LINHAS 3 e 4 (perfil): a espada aparece inteira, do cabo à ponta.

## 4. ATAQUE COM ESPADA — corte horizontal — 6 colunas × 4 linhas

> Sprite sheet de ATAQUE COM ESPADA, corte horizontal. Grade de 6 colunas por 4 linhas,
> 24 quadros. Mesma ordem de direções.
>
> [BLOCO BASE]
>
> AS 6 FASES, nesta ordem:
> 1. preparação: tronco gira para trás, espada recuada atrás do ombro direito, peso na
>    perna de trás, joelhos dobrados — a pose que "carrega" o golpe
> 2. início do corte: quadril inicia a rotação, espada começa a vir, braço abrindo
> 3. impacto: braço em EXTENSÃO MÁXIMA, lâmina atravessando na horizontal à frente do
>    corpo, corpo projetado para a frente, cabelo e capa arrastando para trás — este é o
>    quadro mais dramático da folha
> 4. atravessou: espada já do outro lado, tronco torcido no fim da rotação, ainda em
>    velocidade
> 5. recuperação: braço relaxando, espada baixando, peso voltando ao centro
> 6. volta à guarda: quase a postura de combate, pronto para o próximo golpe
>
> RASTRO: nos quadros 3 e 4, um arco de corte claro (branco-azulado) acompanhando o
> caminho da lâmina, desenhado em pixel art chapado — sem desfoque, sem transparência
> suave. O arco é um contorno de forma, não um brilho.
> A silhueta muda MUITO entre os quadros. Golpe que não deforma a silhueta não lê como
> golpe.

## 5. ATAQUE COM ESPADA — corte vertical (de cima para baixo) — 6 colunas × 4 linhas

> Sprite sheet de ATAQUE COM ESPADA, golpe vertical descendente. Grade de 6 colunas por
> 4 linhas, 24 quadros. Mesma ordem de direções.
>
> [BLOCO BASE]
>
> AS 6 FASES: 1 espada erguida acima da cabeça com as duas mãos, corpo esticado para
> cima na ponta dos pés · 2 início da descida, tronco começando a fechar · 3 IMPACTO:
> lâmina descendo à frente do corpo em extensão máxima, joelhos dobrados absorvendo,
> corpo baixo e compacto · 4 lâmina chegando ao chão, poeira mínima na ponta · 5 puxando
> a espada de volta, corpo subindo · 6 volta à guarda.
> RASTRO nos quadros 2, 3 e 4: arco vertical claro acompanhando a lâmina, em pixel art
> chapado.
> Contraste de silhueta obrigatório: quadro 1 é o corpo mais ALTO e esticado da folha,
> quadro 3 é o mais BAIXO e compacto.

## 6. ESTOCADA (golpe de ponta) — 5 colunas × 4 linhas

> Sprite sheet de ESTOCADA com a espada. Grade de 5 colunas por 4 linhas, 20 quadros.
> Mesma ordem de direções.
>
> [BLOCO BASE]
>
> AS 5 FASES: 1 recuo, espada puxada junto ao quadril com a ponta para a frente, corpo
> comprimido de lado · 2 impulso da perna de trás, começando a avançar · 3 ESTOCADA:
> braço e corpo em extensão máxima para a frente, perna da frente bem avançada, quase um
> afundo, lâmina apontando reto — o corpo forma uma linha diagonal única do pé de trás à
> ponta da espada · 4 mantendo a extensão, começando a recolher · 5 volta à guarda.
> RASTRO no quadro 3: linha reta clara saindo da ponta da lâmina para a frente.

## 7. COMBO FINAL — giro 360° — 6 colunas × 4 linhas

> Sprite sheet de GOLPE GIRATÓRIO, o personagem roda 360 graus com a espada estendida.
> Grade de 6 colunas por 4 linhas, 24 quadros. Mesma ordem de direções (a direção é a
> que ele encara ao COMEÇAR e ao TERMINAR o giro).
>
> [BLOCO BASE]
>
> AS 6 FASES: 1 agachado carregando, espada recuada, corpo torcido ao máximo · 2 início
> do giro, já de perfil · 3 meio do giro, de costas para a direção inicial, espada
> estendida na horizontal · 4 três quartos do giro, do outro perfil · 5 completando,
> voltando a encarar a direção inicial, espada ainda estendida · 6 parada firme, joelho
> dobrado, espada baixando.
> RASTRO: nos quadros 2 a 5, um arco circular claro em volta do personagem, formando um
> anel quase completo no quadro 4. Pixel art chapado, sem desfoque.

## 8. COLETAR / AGACHAR — 5 colunas × 4 linhas

> Sprite sheet de COLETAR ALGO DO CHÃO. Grade de 5 colunas por 4 linhas, 20 quadros.
> Mesma ordem de direções. Espada na bainha.
>
> [BLOCO BASE]
>
> AS 5 FASES: 1 em pé, começando a inclinar o tronco · 2 agachando, joelhos dobrando,
> uma das mãos descendo · 3 AGACHADO: joelho no chão ou quase, mão tocando o chão à
> frente dos pés, cabeça baixa olhando para o que pega — corpo bem compacto · 4
> levantando, mão fechada trazida contra o peito · 5 em pé de novo, olhando para a mão
> fechada.
> A silhueta do quadro 3 tem que ser MUITO mais baixa e compacta que a do 1.
> A capa azul cai para a frente ao agachar e volta ao levantar.

## 9. LEVAR DANO — 3 colunas × 4 linhas

> Sprite sheet de PERSONAGEM ATINGIDO. Grade de 3 colunas por 4 linhas, 12 quadros.
> Mesma ordem de direções (a direção é para onde ele estava virado ao ser atingido).
>
> [BLOCO BASE]
>
> AS 3 FASES: 1 impacto: corpo empurrado para TRÁS, tronco torcido, cabeça jogada, um
> braço subindo em reflexo, pés saindo do lugar · 2 cambaleando, joelhos dobrados,
> tentando recuperar o equilíbrio · 3 firmando de novo, quase de volta à postura normal.
> No quadro 1, o personagem inteiro clareia — todos os tons puxam para o branco-rosado,
> como o flash de dano dos jogos 16-bit. Mantenha o contorno escuro mesmo assim.

## 10. QUEDA / DERROTA — 4 colunas × 1 linha

> Sprite sheet de QUEDA. Grade de 4 colunas por 1 linha, 4 quadros, personagem visto de
> frente apenas.
>
> [BLOCO BASE]
>
> AS 4 FASES: 1 joelhos cedendo, tronco curvando para a frente, espada escapando da mão
> · 2 de joelhos, uma das mãos no chão · 3 caindo de lado, espada já no chão ao lado ·
> 4 caído de lado imóvel, olhos fechados, capa espalhada, espada largada no chão.

## 11. VITÓRIA / GUARDAR A ESPADA — 5 colunas × 1 linha

> Sprite sheet de POSE DE VITÓRIA. Grade de 5 colunas por 1 linha, 5 quadros,
> personagem visto de frente apenas.
>
> [BLOCO BASE]
>
> AS 5 FASES: 1 fim do último golpe, espada baixa · 2 girando a espada na mão · 3 espada
> erguida na diagonal para o alto, olhando para a lâmina, peito aberto · 4 levando a
> lâmina à bainha no quadril esquerdo · 5 espada guardada, mãos ao lado do corpo, queixo
> erguido, capa assentando.

---

## Ordem que eu recomendo gerar

1. **Caminhada** — sem ela nada funciona no jogo
2. **Parado** — hoje o personagem congela num quadro seco ao soltar a tecla
3. **Ataque horizontal** — o motor já sabe usar uma linha de ataque e a folha atual não tem nenhuma
4. **Coletar** — a captura de fragmentos pede este gesto
5. Postura de combate, vertical, estocada, dano
6. Giro, queda, vitória — acabamento

## Como me mandar

Ponha os arquivos na pasta com nomes claros: `achilles_caminhada.png`,
`achilles_parado.png`, `achilles_ataque_h.png`, e assim por diante. Se a ferramenta só
gerar uma linha por vez, mande as 4 imagens separadas com a direção no nome
(`achilles_caminhada_frente.png` etc.) que eu monto a folha.

Eu recorto o magenta, alinho os pés na mesma linha de base e ligo cada folha na ficha
do personagem. A ficha aceita quantidades diferentes de quadros por folha, então não
precisa forçar tudo em 8 colunas — o que não pode variar é a ordem das direções.
