# GUIA-DEPLOY — Boca Maldita (np: bmaldita.vercel.app)

Documento operacional do deploy, smoke tests e higiene. **Lê antes de fazer qualquer deploy.**

## 1. Regra de ouro: UM deploy por lote

- Um commit por lote → `git push origin main` → **UMA** execução de `npx vercel --prod --yes`.
- **NUNCA** loops de retry: cada execução nova cria um deployment novo (polui o histórico e
  torna ambíguo qual é o atual).
- Pré-requisitos antes do deploy: `npm run typecheck`, `npm run build`, `npm test` e, se
  mexeu em API/DB, `npm run smoke` (vê secção 4).

## 2. Fluxo correto e o "Error: fetch failed"

### Sequência
1. Push do commit para `main`.
2. `npx vercel --prod --yes` (o `--yes` usa as env vars do projeto ligado; não há env vars locais
   a definir para produção).
3. Verificar:
   - `npx vercel ls --prod bmaldita --limit 3` → o deployment mais recente com `● Ready` +
     `Environment Production` é o que está aliased a `bmaldita.vercel.app`.
   - `curl -sI https://bmaldita.vercel.app/` → deve responder 200 (o alias aponta sempre ao
     último Ready).

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
**Deployment de produção atual:** `bmaldita-ee779dbs6-smpsandro1239s-projects.vercel.app`
(commit `624e517`).

## 3. Base de dados: produção vs teste

- **Produção:** Turso (`TURSO_URL` + `TURSO_AUTH_TOKEN`, injectados pelo Vercel em runtime;
  `.env` local contém os mesmos para desenvolvimento).
- Decisão de ligação em `api/lib/storage.ts`: se `TURSO_URL`+token → Turso; senão, se não `VERCEL`
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

- Admin de produção: `x-admin-token` (header). O token vem de `ADMIN_TOKEN` (env) e pode ser
  sobreposto por um valor guardado em `settings` via API admin.
- `.env` e `.env*` estão excluídos do upload (`.vercelignore` ancorado à raiz). Não commitar
  segredos.