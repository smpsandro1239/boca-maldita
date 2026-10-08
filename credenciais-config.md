# Credenciais de Produção — Boca Maldita (Vercel)

Como criar as credenciais que **só o dono da conta** pode criar, e onde as colocar.

> A Vercel **não lê o ficheiro `.env` do repositório** (está gitignored). As variáveis têm
> de ser adicionadas no painel da Vercel (ou via CLI `vercel env add`).

A lógica de ligação à base de dados (Turso vs SQLite vs memória) está em
[GUIA-DEPLOY.md §3](GUIA-DEPLOY.md). Aqui é só *como obter* os valores.

---

## Estado das variáveis

| Variável | Quem trata | Estado |
| --- | --- | --- |
| `APP_URL` | Automático | URL pública da aplicação |
| `SITE_CONTACT_EMAIL` | Automático | Email de contacto mostrado no site |
| `ADMIN_TOKEN` | Automático | Gerado pelo projecto (ver `.env`) |
| `SMTP_HOST` | Automático | `smtp.gmail.com` |
| `SMTP_PORT` | Automático | `587` |
| `SMTP_SECURE` | Automático | `false` |
| `SMTP_USER` | Automático | Conta Gmail do dono |
| `MAIL_FROM` | Automático | `Boca Maldita <conta-do-dono@gmail.com>` |
| `SMTP_PASS` | **Passo 1** | App password do Gmail — *tem formato inesperado (11 caracteres) mas é aceite; por confirmar no dashboard* |
| `TURSO_URL` | **Passo 2** | URL da base Turso |
| `TURSO_AUTH_TOKEN` | **Passo 2** | Token gerado para a base |

---

## Passo 1 — `SMTP_PASS` (palavra-passe de app do Gmail)

Sem isto, os emails de confirmação de reserva **não saem**.

1. Abrir https://myaccount.google.com/security
2. Ativar **Verificação em 2 passos** (indispensável — a Google exige para palavras-passe de app).
3. Pesquisar **"Palavras-passe de app"** (ou https://myaccount.google.com/apppasswords).
4. Criar nova app com o nome `boca-maldita`.
5. Copiar a palavra-passe gerada (16 caracteres, com espaços — **tirar os espaços**).
6. Colar no `SMTP_PASS` do ficheiro `.env` local **e** na Vercel (passo 3).

Exemplo: a Google mostra `abcd efgh ijkl mnop` → colar `abcdefghijklmnop`.

> ⚠️ A palavra-passe normal do Gmail **não** funciona — tem de ser a de app.
>
> **Por confirmar:** o valor actual em produção tem 11 caracteres e caracteres não
> alfabanuméricos — não é o formato de 16 acima. Funciona (o Gmail não o rejeita), mas a
> origem é desconhecida. Ler no dashboard da Vercel para confirmar o que lá está. Se um dia
> deixar de enviar, este é o primeiro suspeito. Ver [docs/email.md](docs/email.md).

---

## Passo 2 — `TURSO_URL` e `TURSO_AUTH_TOKEN` (base de dados persistente)

Sem isto, em produção as reservas/settings ficam **em memória** e perdem-se em cold starts.

1. Criar conta em https://turso.tech (grátis, login com GitHub/Google).
2. **Create database** (dashboard).
3. Dar um nome (ex.: `boca-maldita`) e criar.
4. Copiar o **URL** mostrado (`libsql://<nome-base>-<org>.turso.io`) → é o `TURSO_URL`.
5. Em opções da base → **Tokens** → **Generate Token** → copiar (`eyJ...`) → é o `TURSO_AUTH_TOKEN`.
6. Colar ambos no `.env` local **e** na Vercel (passo 3).

> O token começa normalmente por `eyJ` e só aparece uma vez — guardar logo.

> Os valores vão **entre aspas**, sobretudo o `TURSO_AUTH_TOKEN`: é um JWT com pontos e, sem
> aspas, o shell ou o parser da Vercel podem truncá-lo. O mesmo para o `ADMIN_TOKEN`.
> Ver [GUIA-DEPLOY.md §3](GUIA-DEPLOY.md).

---

## Passo 3 — Colocar na Vercel

### Opção A — Dashboard (sem terminal)

1. Painel do projecto → **Settings** → **Environment Variables**.
2. **Add New** para cada variável: nome = valor (do `.env`).
3. Escolher **All Environments** (ou só Production).
4. **Save** → **Redeploy** para entrar em vigor.

### Opção B — CLI (se `npx vercel login` já estiver feito)

```bash
echo "VALOR" | npx vercel env add APP_URL production preview development
echo "VALOR" | npx vercel env add SITE_CONTACT_EMAIL production preview development
echo "VALOR" | npx vercel env add ADMIN_TOKEN production preview development
echo "VALOR" | npx vercel env add SMTP_HOST production preview development
echo "VALOR" | npx vercel env add SMTP_PORT production preview development
echo "VALOR" | npx vercel env add SMTP_SECURE production preview development
echo "VALOR" | npx vercel env add SMTP_USER production preview development
echo "VALOR" | npx vercel env add MAIL_FROM production preview development
# depois de criados os passos 1 e 2:
echo "VALOR" | npx vercel env add SMTP_PASS production
echo "VALOR" | npx vercel env add TURSO_URL production
echo "VALOR" | npx vercel env add TURSO_AUTH_TOKEN production
```

Ver com: `npx vercel env ls production`

---

## Como verificar

- `curl https://bmaldita.vercel.app/api/health` → 200.
- `curl https://bmaldita.vercel.app/api/admin/assets` com `x-admin-token` →
  `{"enabled":true,...}` (deixa de ser `false` quando o `ADMIN_TOKEN` está no servidor).
- Criar uma reserva e confirmar o email → linha `[email] Confirmação enviada ...` nos logs
  (como ler: [docs/email.md](docs/email.md)).
- Após `TURSO_URL`/token: criar uma reserva, esperar ~1 minuto (cold start) e confirmar que
  os dados persistem.
