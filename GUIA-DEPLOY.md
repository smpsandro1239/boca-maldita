# GUIA-DEPLOY — Boca Maldita (np: bmaldita.vercel.app)

Documento operacional do deploy, smoke tests e higiene. **Lê antes de fazer qualquer deploy.**

## 1. Regra de ouro: UM deploy por lote

- **O deploy é o push para `main`.** Push para `main` faz deploy de produção; pushes
  para outros ramos fazem previews.
- Um lote = `npm run verify` verde → **um commit** → **um `git push origin main`** → validação.
- **NUNCA** loops de CLI para "tentar outra vez": cada `vercel --prod` cria um deployment
  novo, polui o histórico e torna ambíguo qual está em produção.
- **Gate único obrigatório:** `npm run verify` (typecheck + testes + smoke + build),
  **antes** do push. Não vale a pena rodar as peças separadamente.
- **Publicar a carta em produção exige `npm run verify` verde.** É uma escrita real na base
  de dados e não é reversível por deploy: tem de ser precedida de uma comparação item a
  item entre a produção e `MENU_ITEMS`, e de **um único `PUT`** (nunca `DELETE` + `PUT`).

### ⛔ NÃO acrescentar `"git": { "deploymentEnabled": false }` ao `vercel.json`

Descoberto em 2026-10-03. A documentação da Vercel diz que a chave "specifies the branches
that will not trigger an auto-deployment when committing to them", ou seja, só commits do
Git. **Na prática também bloqueia o deploy por CLI**, que falha com
`Error: Not authorized` — o mesmo erro que a v60 dá sem pin, e por isso facilmente
confundido com o problema da versão.

Como o deploy passou a ser o push, a chave só serviria para tornar a CLI inutilizável.
Fica o auto-deploy activo de propósito.

### ⛔ O CLI constrói o working directory, não o commit

Este é o motivo de o deploy ser o push. `vercel --prod` faz upload do que está em disco,
não do `HEAD`. Em 2026-10-03 o deployment `i7xi8v49m` foi construído com o `vercel.json`
**já alterado em disco** e o `HEAD` **sem** essa alteração: a produção ficou órfã de
qualquer commit, e nenhum deployment de CLI traz `githubCommitSha`. Com o push, o
deployment corresponde sempre a um SHA verificável.

## 2. Fluxo correcto e o "Error: fetch failed"

### Sequência
1. `npm run verify` — tem de estar verde, **antes** de qualquer push para `main`.
2. `git add -A && git commit` — um commit por lote.
3. `git status --porcelain` tem de estar **vazio**. O push é o deploy: não pode apanhar o
   working directory sujo.
4. `git push origin main` — **isto é o deploy de produção.**
5. Verificar:
   - `npx vercel@59.26.0 ls bmaldita --limit 3` → o deployment mais recente com `● Ready` +
     `Environment Production` é o que está aliased a `bmaldita.vercel.app`.
   - `npx vercel@59.26.0 inspect <url-do-deploy>` → confirmar que `githubCommitSha` está
     preenchido e **igual ao `HEAD`**. Se vier vazio, o deployment não veio do push e a
     rastreabilidade está perdida.
   - `npx vercel@59.26.0 curl -s https://bmaldita.vercel.app/ > body.html` → deve conter o
     `<title>` do site. **Usar redireccionamento do shell, não `-o`/`-w`**: o `vercel curl`
     não honra essas opções do `curl` e cria ficheiros chamados `-s`/`-w` no repositório.

> O **pin `vercel@59.26.0`** mantém-se para os comandos de leitura e inspecção (`ls`,
> `inspect`, `curl`). Sem pin, o `npx vercel` instala a v60.

### Causa-raiz investigada (2026-09-24)
- **Sintoma:** o CLI imprime os logs de build remoto e depois falha com `Error: fetch failed`,
  sugerindo `vercel redeploy <url>`.
- **Evidência:** o deployment remoto é **criado e fica Ready na mesma** — o erro é só do lado do
  cliente (CLI/QTD). O upload + build correm no Vercel; a falha é na *streaming/finalização* entre
  o CLI e o control plane (rede instável desta máquina, CLI 59.26.0, Node 24). **Não** é o
  allow-scripts do esbuild e **não** é o `.vercelignore` (esse era outro problema, já fechado:
  o padrão `data` não ancorado removia `src/data/` do upload e quebrava o vite build remoto —
  corrigido em `ccc5ad3` com padrões ancorados à raiz).
- **Mitigação (quando acontecer):** não repetir `--prod`. Correr `npx vercel ls --prod bmaldita
  --limit 3`. Se já existir um `Ready` mais novo que o commit e o `curl -sI` do domínio responder
  com o build novo, acabou. Se existir um deployment Ready do mesmo commit, reutilizar
  `npx vercel redeploy <url> --yes` uma vez (reusa a mesma fonte, sem re-upload). Se mesmo assim
  falhar, reportar ao utilizador — não fazer loops.

### Limpeza de duplicados (realizada em 2026-09-24)
Removidos com `npx vercel rm <url> --yes` (deployments de produção não-atuais):
`pqgla87vo`, `guwkwj57r` (Error) e os duplicados de retry `crla59xdd`, `mohz11fjg`,
`f9hlr17a8`, `nhafp553p`.
**Deployment de produção atual:** `bmaldita-b28qqdi5h-smpsandro1239s-projects.vercel.app`
(commit `81523ed`).

## 3. Base de dados: produção vs teste

- **Produção:** Turso (`TURSO_URL` + `TURSO_AUTH_TOKEN`, injectados pelo Vercel em runtime;
  `.env` local contém os mesmos para desenvolvimento).
- **Os valores vão sempre entre aspas** no `.env` e nas variáveis da Vercel,
  sobretudo `TURSO_AUTH_TOKEN`: é um JWT com pontos e, sem aspas, pode ser
  truncado pelo shell ou pelo parser. O mesmo se aplica ao `ADMIN_TOKEN`.
- Decisão de ligação em `server/lib/storage.ts`: se `TURSO_URL`+token → Turso; senão, se não `VERCEL`
  → SQLite local (`DB_PATH`, default `data/boca-maldita.db`); senão memória.
- Devido ao `dotenv/config` no arranque da API: **qualquer smoke que levante a API localmente
  tem de forçar `TURSO_URL=""` e `TURSO_AUTH_TOKEN=""` no ambiente do processo filho** — o dotenv
  não sobrescreve variáveis já definidas, por isso os vazios impedem a leitura do Turso de `.env`.

## 4. Smoke tests — NUNCA contra produção

Os smoke NUNCA escrevem em produção (já aconteceu uma vez: datas fechadas de teste a bloquear
reservas reais).

```bash
npm run smoke
```

Faz fail-closed e arranca a API local (`server/index.ts`) numa porta livre com:
- **DB SQLite efémero** em `%TEMP%/bmtest-*/boca-maldita-smoke.db` (apagado no fim) — primeira
  reserva tem `reference === 'BM-0001'`, o que prova isolamento;
- `SMTP_HOST=""` (nenhum e-mail sai),
- `ADMIN_TOKEN="smoke-test-token"`.

Verifica health, reservations-config, menus, site-content, e faz round-trips
(create + read + delete) de reservas, contactos e newsletter.

### Turso de teste (opcional — o smoke em SQLite efémero já cobre o que interessa)
O CLI `turso` **não tem build nativa para Windows** (daí o `command not found`), pelo que
`turso auth login` / `turso db create` **não funcionam nesta máquina**. Para uma BD cloud de
teste, criá-la pelo **dashboard da Turso** (https://turso.tech — "Databases" → "Create
database", sugestão de nome `boca-maldita-test`) e gerar um token para essa BD em "Tokens".
Só com WSL ou Docker (com o CLI Turso instalado) é que `turso` funciona em linha de comandos.
Depois de criar a BD:
```bash
SMOKE_TURSO_URL="libsql://boca-maldita-test-<org>.turso.io" SMOKE_TURSO_AUTH_TOKEN="<token>" npm run smoke
```
O script **aborta** se a URL não contiver `test`/`smoke`/`local`, ou se for igual à
`TURSO_URL` de produção. Nunca corre smoke contra a produção.

## 5. Checklist pós-deploy (conforme o que foi tocado)

- API/DB: `curl -sI https://bmaldita.vercel.app/api/health` → 200. `/api/site-content` → devolve
  defaults quando um campo armazenado está vazio.
- `index.html`/headers: re-smoke CSP em prod (assets a partir de `lh3.googleusercontent.com`,
  `facebook.com` no `frame-src`; teste local reutilizável em
  `%LOCALAPPDATA%\Temp\opencode\rcheck\`).
- Conteúdo: se alterou textos/seo, confirmar que o HTML serve o que o painel publicou.

## 6. Segredos / token admin

- **Autenticação do painel (D-3):** sessão por cookies **`bmtauth` (HttpOnly) + `bmcsrf`**, TTL de
  14 dias, criados pelo `POST /api/admin/login`. As mutações exigem também o header
  `X-Csrf-Token`. O header `X-Admin-Token` continua aceite como **fallback server-to-server**
  (scripts/integrações) — não é usado pelo painel.
- O token efetivo vem de `ADMIN_TOKEN` (env) e pode ser sobreposto por um valor guardado em
  `settings` via `PUT /api/admin/security/token`.
- **Armadilha do `.env` (aspas):** o `ADMIN_TOKEN` local está **entre aspas** (`ADMIN_TOKEN="…"`).
  O `source .env` do bash tira as aspas; qualquer script que leia o ficheiro com regex precisa de
  as remover também (`/^"(.*)"$/m → $1`), senão o login devolve
  `"Token de administrador inválido."`. Preferir sempre `source .env` quando for disparar a API
  localmente em vez de reimplementar o parsing.
- `.env` e `.env*` estão excluídos do upload (`.vercelignore` ancorado à raiz). Não commitar
  segredos.