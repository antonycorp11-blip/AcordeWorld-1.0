# Composição — escalas, acordes e a build do personagem

> Documento de desenho. A ideia central: **o acorde é o item, a escala é o contexto, e o
> efeito é a função harmônica.** O mesmo acorde equipado com escalas diferentes faz coisas
> diferentes — porque em música ele *é* coisa diferente.

---

## O que existe hoje, e o que vai fora

| Hoje | Situação |
|---|---|
| Acordes vêm de um **sorteio aleatório num lago** | **Sai.** Sorte não ensina nada. |
| `acordesObtidos` guarda quantidade por grau (1 a 7) | Fica, mas passa a guardar **cifra**, não grau |
| `SLOTS_DE_ACORDE = 2` | Existe no código, nunca foi usado |
| Acordes não fazem nada | É o que este documento resolve |
| Arte dos 7 selos de acorde | **Fica.** Já está recortada e carregada |

---

## A regra que sustenta tudo

O campo harmônico da escala maior é fixo:

| Grau | Tríade | Em Dó maior | Em Sol maior | Em Fá maior |
|---|---|---|---|---|
| **I** | maior | **C** | G | F |
| **ii** | menor | Dm | Am | Gm |
| **iii** | menor | Em | Bm | Am |
| **IV** | maior | F | **C** | B♭ |
| **V** | maior | **G** | D | **C** |
| **vi** | menor | Am | Em | Dm |
| **vii°** | diminuta | B° | F♯° | E° |

Repare no **C**: é o **I** em Dó maior, o **IV** em Sol maior e o **V** em Fá maior. Mesmo
acorde, três funções.

**É daí que sai a mecânica.** O acorde que você possui é um objeto só; o efeito dele muda
conforme a escala que você tem equipada.

> Você tem o acorde **Sol maior**.
>
> — Com **Dó maior** equipada, ele é o **V**: dominante, tensão máxima → **+ataque**
> — Com **Sol maior** equipada, ele é o **I**: repouso, casa → **+vida**
> — Com **Ré maior** equipada, ele é o **IV**: subdominante, abre espaço → **+defesa**

Trocar de build deixa de ser farmar item novo. **É trocar de escala.**

---

## O efeito de cada função

A função no jogo é a função harmônica de verdade. Quem sabe teoria já sabe jogar; quem
joga muito aprende teoria sem aula.

| Grau | O que a função é na música | O que faz no jogo |
|---|---|---|
| **I** — tônica (maior) | Repouso. É para onde tudo volta. | **+Vida máxima** e regeneração fora de combate |
| **ii** — supertônica (menor) | Prepara a dominante. Não é destino, é caminho. | **−Recarga de habilidade**. Ele prepara o próximo |
| **iii** — mediante (menor) | Ambígua. Serve de ponte entre I e V. | **+Dano de habilidade** (magia) |
| **IV** — subdominante (maior) | Afasta de casa, abre o espaço. | **+Defesa** e resistência |
| **V** — dominante (maior) | Tensão máxima. Quer resolver. | **+Ataque** — o maior bônus de dano do jogo |
| **vi** — relativa menor | A mesma escala, vista pelo lado triste. | **+Roubo de vida** |
| **vii°** — sensível (diminuta) | Instável. Precisa resolver ou dói. | **+Crítico** e **+dano crítico** alto, mas **−vida máxima** |

O **vii°** cobrar vida não é castigo de balanceamento inventado: acorde diminuto é o mais
instável do campo, e quem o carrega sem resolver fica exposto. A mecânica repete a teoria.

### E a qualidade importa também

Além da função, a **qualidade** da tríade dá um tempero:

- **Maior** (I, IV, V) — efeitos de força e presença: ataque, vida, defesa
- **Menor** (ii, iii, vi) — efeitos de manejo e sustentação: recarga, magia, roubo
- **Diminuta** (vii°) — risco: crítico alto com custo

Isso é o que faz um jogador perceber sozinho, jogando, que **maior soa firme e menor soa
manejável** — sem nenhum texto explicando.

---

## A tela de Composição

Nova tela, ao lado da Ficha e dos Equipamentos.

```
┌──────────────────────────── COMPOSIÇÃO ────────────────────────────┐
│                                                                     │
│  ESCALAS EQUIPADAS (3)          ACORDES EQUIPADOS (7)               │
│  ┌────────┬────────┬────────┐   ┌───┬───┬───┬───┬───┬───┬───┐       │
│  │ Dó     │ Sol    │ vazio  │   │ C │Dm │ G │Am │ F │ - │ - │       │
│  │ maior  │ maior  │        │   └───┴───┴───┴───┴───┴───┴───┘       │
│  └────────┴────────┴────────┘                                       │
│                                                                     │
│  COMO CADA ACORDE ESTÁ FUNCIONANDO AGORA                            │
│  ┌───────────────────────────────────────────────────────────┐      │
│  │ C   → I em Dó maior      · +48 vida        [trocar p/ IV] │      │
│  │ Dm  → ii em Dó maior     · −6% recarga                    │      │
│  │ G   → V em Dó maior      · +14 ataque      [trocar p/ I]  │      │
│  │ Am  → vi em Dó maior     · +3% roubo       [trocar p/ ii] │      │
│  │ F   → IV em Dó maior     · +5% defesa                     │      │
│  └───────────────────────────────────────────────────────────┘      │
│                                                                     │
│  CADÊNCIAS ATIVAS                                                   │
│  ✓ V → I  (G → C)     "Resolução"  +10% dano após habilidade        │
│  ✗ ii-V-I             falta nada — você tem os três!                │
└─────────────────────────────────────────────────────────────────────┘
```

O **[trocar]** aparece quando o acorde pertence a mais de uma escala equipada. É a decisão
de build: o **G** pode ser o seu ataque (V em Dó) ou a sua vida (I em Sol). Você escolhe.

Um acorde equipado que **não pertence a nenhuma escala equipada** fica inerte — mostrado
apagado, com o aviso *"nenhuma escala equipada contém este acorde"*. Isso ensina campo
harmônico melhor que qualquer texto: o jogador vai atrás de saber por que o Fá♯ não
funciona em Dó maior.

---

## Cadências — as passivas e a habilidade extra

Você pediu que os acordes pudessem dar passivas ou habilidade extra. As **cadências** são
o lugar certo disso: elas premiam quem entende para onde a harmonia anda.

| Cadência | Acordes | O que dá |
|---|---|---|
| **Resolução** | V → I | Passiva: +10% de dano no golpe seguinte a uma habilidade |
| **Plagal** ("amém") | IV → I | Passiva: cura 2% da vida ao encerrar um combo |
| **Suspensiva** | termina em V | Passiva: +15% de crítico, mas a recarga sobe 10% — a tensão não resolveu |
| **Perfeita completa** | **ii – V – I** | **Habilidade extra**, específica de cada escala |

A **ii–V–I** é a progressão mais usada da música ocidental. Ela sendo o combo mais forte do
jogo não é coincidência: é a tese do projeto. O jogador que descobre isso sozinho aprendeu
jazz sem saber.

E a habilidade extra muda com a escala, o que dá razão para forjar escalas diferentes:

- **ii–V–I em Dó maior** → *Resolução Maior*: cura em área
- **ii–V–I em Lá menor** → *Resolução Menor*: dreno em área
- **ii–V–I em Sol maior** → *Resolução Brilhante*: aumenta o dano do grupo

---

## Como se ganha acorde

**Forjar uma escala dá direito a escolher até 3 dos 7 acordes dela.**

Não é sorteio. Você monta Dó maior, e a tela pergunta: *quais três você quer?* Quer os
outros quatro? **Monta Dó maior de novo.** Três forjas dão os sete, com uma sobra.

Isso resolve três coisas de uma vez:
1. Dá razão para repetir a mesma escala em vez de só correr atrás de escalas novas
2. Faz a primeira escolha doer, que é o que torna escolha interessante
3. Amarra a economia: mais acordes custam mais Notas, e Notas custam fragmentos

E o **lago do sorteio** deixa de dar acorde. Passa a dar fragmento puro e, de vez em quando,
uma dica de escala — continua sendo um lugar de sorte, mas sorte que não substitui estudo.

---

## Escopo: começar pelo maior

O Forjador hoje monta **escala maior** (T‑T‑S‑T‑T‑T‑S). O campo harmônico maior é fixo e
já dá o sistema inteiro.

A **menor natural** entra depois, com o próprio campo — e aí a mecânica fica ainda mais
bonita, porque a relativa menor **compartilha os sete acordes** com a maior, mudando só as
funções:

| Acorde | Em Dó maior | Em Lá menor |
|---|---|---|
| C | I | III |
| Dm | ii | iv |
| Em | iii | v |
| F | IV | VI |
| G | V | VII |
| Am | vi | **i** |
| B° | vii° | ii° |

Ou seja: quem forjar Lá menor **não ganha acorde novo nenhum** — ganha **sete funções
novas para os acordes que já tem**. É a lição mais elegante que esse sistema pode dar, e
ela cai de graça.

---

## O que precisa ser construído

| Item | Tamanho |
|---|---|
| Guardar acorde por **cifra** (`C`, `Dm`, `G`…) em vez de grau | pequeno |
| Tabela de campo harmônico e função de um acorde numa escala | pequeno |
| `bonusDeAcordes()` entrando em `derivedStats()`, como o equipamento já faz | pequeno |
| Escolher 3 acordes ao selar a escala | médio — tela nova no Forjador |
| Tela de **Composição** | médio |
| Cadências e a habilidade extra | médio |
| Tirar acorde do sorteio do lago | pequeno |

Nada aqui exige sistema novo de raiz: o `derivedStats()` já soma equipamento do mesmo jeito,
e o Forjador de Escalas já existe. É encaixe, não fundação.
