# Prompts — Nocth e Vexor (folhas de sprite)

> A arte dos dois já existe. Estes prompts **não descrevem aparência nenhuma** — só o
> formato da folha e o que cada fileira anima, para não conflitar com o personagem que
> você já gerou.
>
> Mesmo formato das cinco criaturas que entraram sem problema: recorto em segundos e
> registro sem precisar adivinhar a grade.

## Regras de formato (valem para os dois)

```
Gere uma FOLHA DE SPRITES deste personagem, mantendo exatamente a aparência,
as cores e o estilo que ele já tem.

FORMATO OBRIGATÓRIO:
- Grade EXATA de 5 colunas por 4 fileiras, 20 quadros no total
- Imagem quadrada 1254x1254 pixels
- Fundo MAGENTA PURO #FF00FF, chapado, sem sombra e sem gradiente
- Cada quadro centralizado na sua célula, com margem — nada encostando na borda
- O personagem tem SEMPRE o mesmo tamanho e os PÉS na mesma altura nos 20 quadros
- Vista de cima com leve inclinação (top-down 3/4), como um RPG 2D clássico
- Sem texto, sem moldura, sem numeração, sem linhas de grade desenhadas
```

## As quatro fileiras

```
Fileira 1 — PARADO de frente: respiração sutil, o corpo sobe e desce de leve.

Fileira 2 — ANDANDO de frente: ciclo de caminhada completo, começando e terminando
            de forma que emende em laço.

Fileira 3 — AÇÃO: descrita abaixo, específica de cada um.

Fileira 4 — RECUO E SUMIÇO: dá um passo atrás e se desfaz em sombra e fumaça,
            até restar quase nada no último quadro.
```

---

## NOCTH — fileira 3

```
Fileira 3 — O CORTE SILENCIOSO:
Ele executa um golpe único e horizontal com a arma, da esquerda para a direita.
O corte deixa um rastro que NÃO brilha: uma faixa de escuridão, como se o ar tivesse
sido apagado por onde a arma passou. Nos últimos quadros o rastro se fecha e some.
Termina de perfil, arma baixa.

IMPORTANTE: nada de efeito luminoso ou colorido. O poder dele é subtrair, não iluminar.
```

---

## VEXOR — fileira 3

```
Fileira 3 — A NOTA ERRADA:
Ele toca UMA nota longa no instrumento. Do ponto de contato saem ondas concêntricas
que se DEFORMAM conforme se afastam — começam como círculos e viram formas tortas e
quebradas. Translúcidas. Nos últimos quadros as ondas se expandem para fora do quadro
e ele fica parado, no fim do movimento.

IMPORTANTE: as ondas têm que parecer ERRADAS, não bonitas. Assimétricas, bordas
irregulares, como um som que faz doer o dente.
```

---

## Depois de gerar

Salve os dois na raiz do projeto com qualquer nome. Eu recorto, registro em
`assets/dados/npcs.json` e eles entram na Cena 9.

No Capítulo 2 eles viram inimigos de verdade — aí pedimos as fileiras de combate: golpe,
dano recebido e morte.
