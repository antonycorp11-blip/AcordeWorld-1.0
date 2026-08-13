# Deixar o Claude rodar SQL sozinho (MCP do Supabase)

O objetivo é simples: você programando pelo celular, sem ter de abrir o painel do
Supabase no computador toda vez que uma tabela nova precisa nascer. A Arena, o gacha e
os Ecos vão pedir muita tabela — abrir o SQL Editor à mão em cada uma acaba com a
logística.

Com isto ligado, eu leio o esquema (`list_tables`), rodo consulta (`execute_sql`) e
aplico migração versionada (`apply_migration`) direto daqui.

## O que já está pronto no repositório

O `.mcp.json` na raiz. Ele viaja com o repositório, então vale para **qualquer sessão,
de qualquer aparelho** — não é ajuste de máquina, não precisa refazer pelo celular.

O token **não** está lá dentro. O arquivo aponta para `${SUPABASE_ACCESS_TOKEN}`, que é
lido do ambiente. Segredo em arquivo versionado é segredo publicado: o repositório é
público, e um Personal Access Token do Supabase abre **todos** os projetos da conta.

## Os três passos que só você pode dar

Tudo em `claude.ai/code` → Environments → o ambiente deste projeto.
Documentação: <https://code.claude.com/docs/en/claude-code-on-the-web>

### 1. O `project-ref` no `.mcp.json`

Troque `COLOQUE_O_REF_DO_PROJETO` pelo ref do projeto novo. Ele é o pedaço do meio da
Project URL: em `https://abcdefghijkl.supabase.co`, o ref é `abcdefghijkl`.

Isto prende o servidor a **um** projeto. Vale a pena mesmo com um projeto só: no dia em
que a conta tiver outros, o token continua abrindo todos, e o `--project-ref` é o que
impede um `drop table` meu de cair no lugar errado.

### 2. A variável de ambiente

`SUPABASE_ACCESS_TOKEN` = um Personal Access Token, criado em
<https://supabase.com/dashboard/account/tokens>.

Repare que **não** é a anon key. A anon key é a chave pública do jogo, que só faz o que
o RLS deixa. O PAT é a chave de administração da conta: é com ela que se cria tabela.

### 3. A política de rede

Medido daqui hoje: `api.supabase.com` responde **403 no CONNECT** — a política atual do
ambiente barra. Sem soltar isso, o servidor MCP sobe e não fala com ninguém.

Precisa liberar:

- `api.supabase.com` — a API de administração, por onde a migração passa;
- `*.supabase.co` — o projeto em si, se eu precisar bater no PostgREST.

O `registry.npmjs.org` já está liberado, então o `npx` baixa o pacote sem ajuste.

## Como conferir que pegou

Abra uma sessão nova e me peça para listar as tabelas. Se o MCP estiver de pé eu
respondo com `perfis`, `arena_defesas`, `arena_ranking`, `arena_batalhas`. Se algum dos
três passos faltar, eu digo qual — o erro de rede, o de token e o de ref são distintos.

## O que eu passo a fazer sozinho, e o que continua seu

Passo a fazer: criar e alterar tabela, política de RLS, função, índice, view; conferir
o que existe antes de escrever; consertar migração que saiu torta.

Continua seu, porque o MCP não alcança: criar o projeto, o e-mail de confirmação e
demais ajustes de Auth, chaves de terceiros, e o botão de apagar o projeto.

## Sobre eu poder escrever no banco

O servidor está **sem** `--read-only`, de propósito — é o que você pediu. Então tenho
como apagar dado de verdade. Duas regras que eu sigo por conta:

1. Toda mudança de esquema vai por `apply_migration`, que fica versionada e some no
   `supabase/migrations` — não por `execute_sql` solto. Dá para ler depois o que mudou.
2. `drop` e `delete` sem `where` eu pergunto antes, sempre, mesmo que a tarefa pareça
   pedir. Banco de jogador não tem desfazer.
