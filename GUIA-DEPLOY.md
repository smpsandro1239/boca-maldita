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

### ⛔ `api/index.js` TEM de estar committed — é o ficheiro que a Vercel detecta como função

Parece um artefacto gerado que devia estar no `.gitignore`: `scripts/build-api.mjs` produz
`api/index.js` a partir de `scripts/api-entry.ts` com esbuild, e corre em cada
`npm run build`. **Não pode ser removido do git.** Testado em 2026-10-03 no ramo
`teste/sem-bundle-api`, que fazia `git rm --cached api/index.js` + `.gitignore`:

| | `/api/menus` no preview |
|---|---|
| sem `api/index.js` no repo | HTML — fallback da SPA, **sem função** |
| com `api/index.js` no repo | JSON, 35 itens |

Confirmado pelos **logs de build**, não inferido. Em `vercel inspect <url> --logs` do preview:

```
> node scripts/build-api.mjs && vite build && node scripts/prerender.mjs
api/index.js  89.6kb
```

O esbuild gerou o ficheiro na máquina da Vercel 0,13s depois do `buildCommand` começar — e
mesmo assim não houve função serverless. Isto fecha a hipótese alternativa (o ficheiro não ter
sido gerado): **a detecção de funções acontece sobre os ficheiros do repo, antes do build**,
não sobre o output do build. Explica também o erro *"No more than 12 Serverless Functions"*
quando havia 13 ficheiros em `api/`: a contagem é feita sobre o que está no repositório.

Portanto, versionado é o que está certo. O bundle é **determinístico**: rebuilds sem
mexer no servidor dão conteúdo byte a byte igual. Para impedir que o Windows o marque como
modificado só por causa dos fins de linha, o `api/index.js` está fixado em LF no
`.gitattributes` — deixa de ser preciso `--ignore-cr-at-eol` para distinguir um diff real
de ruído.

**Ao mexer em `server/lib/*`: correr `npm run verify` e commitar o `api/index.js`
resultante no mesmo commit.** Se não aparecer no diff, o servidor
não mudou e o ficheiro pode ficar como está.

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
   - Confirmar a rastreabilidade com o comando de baixo — **`vercel inspect` não serve**,
     ver a nota "Rastreabilidade" mais adiante.
   - `npx vercel@59.26.0 curl -s https://bmaldita.vercel.app/ > body.html` → deve conter o
     `<title>` do site. **Usar redireccionamento do shell, não `-o`/`-w`**: o `vercel curl`
     não honra essas opções do `curl` e cria ficheiros chamados `-s`/`-w` no repositório.

> O **pin `vercel@59.26.0`** mantém-se para os comandos de leitura e inspecção (`ls`,
> `inspect`, `curl`, `api`). Sem pin, o `npx vercel` instala a v60.

### Rastreabilidade: confirmar que o deployment corresponde ao commit

⚠️ **`vercel inspect --json` NÃO devolve metadados Git.** A estrutura que sai é podada —
`id, name, url, target, readyState, createdAt, duration, buildMachine, aliases, builds,
contextName` — e **sem `githubCommitSha`**. O `inspect` em modo texto também não o mostra.
Procurar por ele aí é perda de tempo.

A única via é a API crua, lendo `meta.githubCommitSha`:

```bash
# id do deployment: sai de "vercel inspect <url>" (campo "id", ex. dpl_H2dEE4...)
MSYS_NO_PATHCONV=1 npx vercel@59.26.0 api "/v13/deployments/<id>"
```

⚠️ **O `MSYS_NO_PATHCONV=1` é obrigatório no Git Bash.** Sem ele, o path `/v13/deployments/...`
é convertido num caminho Windows e o comando falha com `Error: Invalid arguments. Use an API
path starting with /` — mensagem que não dá nenhuma pista de que a causa é a conversão de path.

```bash
# ❌ falha: "Error: Invalid arguments."
npx vercel@59.26.0 api "/v13/deployments/dpl_H2dEE4GbTGiFi7yuYzL99XyLaA9F"

# ✅ funciona
MSYS_NO_PATHCONV=1 npx vercel@59.26.0 api "/v13/deployments/dpl_H2dEE4GbTGiFi7yuYzL99XyLaA9F"
```

No PowerShell ou cmd não é preciso `MSYS_NO_PATHCONV`; a conversão de path é específica do
Git Bash. Para comparar com o repositório:

```bash
node -e "const d=require('./insp.json');console.log(d.meta.githubCommitSha)"; git rev-parse HEAD
```

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

## 6. SEO e domínio — o canónico está acoplado ao DNS

**Decisão (2026-10-03):** o domínio final é `https://bocamaldita.pt` (apex, sem `www`).
O `www.bocamaldita.pt` faz **301** para o apex. Idioma: **PT-only**, sem `hreflang` e sem
versão EN.

### ⛔ Nunca mudar o canónico antes do DNS

Hoje `index.html` declara `canonical: https://bmaldita.vercel.app/` e isso **é verdade**:
é para lá que a app está. `og:url`, o `url`/`hasMenu` do JSON-LD, o `Sitemap:` do
`robots.txt` e o `sitemap.xml` apontam para o mesmo sítio, e são coerentes com a realidade.

**A regra:** canónico, `og:url`, `sitemap.xml` e `robots.txt` só passam a
`bocamaldita.pt` **no mesmo lote em que o DNS aponta para a Vercel**. Nunca antes.

Porquê — se o canónico mudar primeiro, o Google recebe "a versão verdadeira desta página
está em `bocamaldita.pt`", responde lá, e encontra o **WordPress**. Passa a considerar a
homepage do WordPress como canónica para o nosso conteúdo e desindexa a app. É **pior do
que não ter canónico nenhum**. O mesmo se aplica ao `sitemap.xml` (aponta o crawler para
conteúdo que não é o nosso) e ao `robots.txt` (o `Sitemap:` errado é sinal de negligência).

Não há terceiro caminho: ou o DNS move e o canónico muda no mesmo lote, ou o canónico fica
em `vercel.app` até lá. Enquanto o DNS não mudar, `bmaldita.vercel.app` é a verdade actual
e o Google aceita.

### Ordem do lote de DNS (quando chegar)

1. apontar `bocamaldita.pt` (A/CNAME) para a Vercel e aguardar propagação
2. `www` → **301** para o apex
3. no **mesmo lote**: `canonical`, `og:url`, JSON-LD `url`/`hasMenu`, `robots.txt` `Sitemap:`,
   `sitemap.xml` `<loc>`
4. verificar com `vercel curl` que o host novo devolve 200 antes de submeter sitemap

### Enquanto o DNS não muda

Deixar como está. Não é dívida, é verdade. A única coisa a fazer entretanto é trabalho que
não depende do host: schema, robots, `/admin` em `noindex`, imagens, conteúdo citável.

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