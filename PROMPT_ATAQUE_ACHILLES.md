# Folha de ATAQUE BÁSICO do Achilles — prompt completo

## Antes de colar

1. **Anexe a folha de caminhada como imagem de referência**, se a ferramenta permitir.
   Ela é a fonte da verdade do personagem: `assets/folhas_originais/achilles_caminhada_original.png`.
2. O bloco de PERMANÊNCIA existe para o personagem não mudar entre folhas. Cole-o
   **inteiro e sem alterar uma palavra** em toda geração, desta e das próximas.
3. O que quebrou na tentativa anterior: as quatro linhas saíram na MESMA direção.
   Medido — as linhas diferiam entre si em 15-18, enquanto na caminhada, onde as
   direções são reais, diferem em 26-29. Por isso o bloco de direções vem primeiro e
   com exemplos do que cada silhueta precisa mostrar.

---

## PROMPT — cole daqui para baixo

Sprite sheet de ATAQUE BÁSICO COM ESPADA para RPG 2D em vista de cima 3/4, pixel art
16-bit. Grade de exatamente 6 colunas por 4 linhas, 24 quadros.

### REGRA MAIS IMPORTANTE — AS QUATRO LINHAS SÃO QUATRO DIREÇÕES DIFERENTES

Esta é a exigência que não pode falhar. Na tentativa anterior as quatro linhas saíram
na mesma direção e a folha foi inutilizada. De frente, de costas e de perfil são
silhuetas COMPLETAMENTE diferentes, não variações da mesma pose.

**LINHA 1 — DE FRENTE.** O personagem encara quem olha. Vê-se o ROSTO INTEIRO: dois
olhos, nariz, boca. Vê-se o peitoral da armadura de frente. A capa azul cai atrás dos
ombros, aparecendo dos dois lados do corpo. O golpe cruza na diagonal à frente do
peito, da direita alta para a esquerda baixa. A lâmina NUNCA cobre o rosto.

**LINHA 2 — DE COSTAS.** O personagem está de costas para quem olha. NÃO SE VÊ O ROSTO
— vê-se a nuca e a parte de trás do cabelo. A capa azul aparece INTEIRA e aberta,
cobrindo as costas, porque é o lado dela que se vê. O golpe acontece à frente do
personagem e portanto fica parcialmente ESCONDIDO pelo corpo dele: só as pontas do
arco aparecem, saindo pelos lados da silhueta.

**LINHA 3 — PERFIL PARA A ESQUERDA.** Corpo de lado, virado para a esquerda da imagem.
Vê-se UM olho só e a linha do nariz recortada contra o fundo. Um ombro à frente do
outro. O golpe varre da direita para a ESQUERDA, e a lâmina se estende para fora do
corpo, para a esquerda.

**LINHA 4 — PERFIL PARA A DIREITA.** Espelho da linha 3: corpo virado para a direita,
um olho visível, golpe varrendo para a DIREITA.

Se duas linhas quaisquer ficarem parecidas, a folha está errada.

### AS 6 FASES DE CADA LINHA, NESTA ORDEM

1. **preparação** — tronco gira para trás, espada recuada atrás do ombro, peso na perna
   de trás, joelhos dobrados. É a pose que "carrega" o golpe: corpo comprimido.
2. **início do corte** — o quadril inicia a rotação, a espada começa a vir, o braço
   abrindo. Peso passando para a frente.
3. **extensão** — braço quase esticado, lâmina já à frente do corpo, corpo projetado.
4. **IMPACTO** — braço em EXTENSÃO MÁXIMA, lâmina atravessando à frente, corpo
   projetado para a frente, cabelo e capa arrastando para trás. Este é o quadro mais
   dramático da folha e a silhueta mais aberta de todas.
5. **acompanhamento** — a espada já passou, tronco torcido no fim da rotação, braço
   relaxando, espada baixando.
6. **volta à guarda** — quase parado, joelhos levemente flexionados, espada recolhida
   à frente do corpo, pronto para o próximo golpe.

A silhueta muda MUITO entre um quadro e o próximo. Golpe que não deforma a silhueta
não lê como golpe.

### RASTRO DA LÂMINA

Nos quadros 3, 4 e 5, um arco de corte claro branco-azulado acompanhando o caminho da
lâmina, desenhado em pixel art chapado — sem desfoque, sem transparência suave, sem
brilho difuso. O arco é um contorno de forma, não uma luz.

**O RASTRO NÃO PODE ULTRAPASSAR A BORDA DA CÉLULA.** Ele tem que caber inteiro dentro
do quadro a que pertence. Se invadir o quadro vizinho, o recorte automático quebra.
Deixe uma folga vazia em volta de cada quadro.

### BLOCO DE PERMANÊNCIA — repita sem alterar, em TODA folha deste personagem

PERSONAGEM: jovem espadachim, cabelo castanho volumoso e bagunçado com mechas
pontudas, olhos castanhos grandes, pele clara, armadura de couro marrom com peitoral e
ombreiras de metal escuro, capa/echarpe azul royal caindo do ombro esquerdo, botas
marrons de cano médio, cinto marrom com fivela dourada.
ESPADA: lâmina reta de aço claro com brilho frio, guarda dourada em forma de clave de
sol, cabo envolto em couro azul escuro, pomo dourado redondo.
ESTILO: pixel art 16-bit (SNES, tipo Secret of Mana / Chrono Trigger), vista de cima em
3/4, contorno escuro consistente de 1 pixel em todo o personagem, sombreado em blocos
chapados com no máximo 3 tons por material, luz vindo de cima e um pouco da esquerda.
PROIBIDO: anti-aliasing, desfoque, gradiente suave, brilho externo, sombra projetada no
chão, moldura, texto, numeração, grade desenhada, borda em volta dos quadros.
FUNDO: magenta puro #FF00FF, chapado, sem variação, sem ruído, sem degradê.
CONSISTÊNCIA: a MESMA identidade visual em todos os 24 quadros — mesmas cores exatas,
mesmo volume de cabelo, mesma altura do personagem, mesma espessura de contorno, mesma
proporção de cabeça e corpo. O personagem tem que ser reconhecível como a mesma pessoa
da folha de caminhada.
ENQUADRAMENTO: personagem centralizado horizontalmente em cada célula, ocupando cerca
de 80% da altura da célula. OS PÉS DE TODOS OS 24 QUADROS ALINHADOS NA MESMA ALTURA —
o personagem não pode subir e descer entre um quadro e outro.

---

## Se a ferramenta não der conta das 4 linhas de uma vez

Gere **uma linha por vez**: 6 quadros em fila horizontal, repetindo o BLOCO DE
PERMANÊNCIA e as 6 FASES em cada geração, e trocando só a descrição da direção.
Mande as 4 imagens com a direção no nome:

- `achilles_ataque_frente.png`
- `achilles_ataque_costas.png`
- `achilles_ataque_esquerda.png`
- `achilles_ataque_direita.png`

Eu monto a folha na ordem certa, casada em escala com as outras.

## Como conferir antes de me mandar

Olhe as quatro linhas lado a lado e responda: **dá para dizer a direção de cada uma sem
ler a legenda?** Na linha 2 dá para ver que ele está de costas? Na 1 vê-se o rosto
inteiro? Se a resposta for não, gere de novo antes de mandar — é mais rápido que eu
processar e devolver o problema.
