# Credenciais de Produção — Boca Maldita (Vercel)

Este documento explica como criar as credenciais que **só o dono da conta** pode criar, e onde as colocar.

> A Vercel **não lê o ficheiro `.env` do repositório** (está gitignored). As variáveis têm de ser adicionadas no painel da Vercel (ou via CLI `vercel env add`).

---

## Estado das variáveis

| Variável | Quem trata | Estado |
| --- | --- | --- |
| `APP_URL` | Feito automaticamente | `https://bmaldita.vercel.app` |
| `SITE_CONTACT_EMAIL` | Feito automaticamente | `smpsandro1239@gmail.com` |
| `ADMIN_TOKEN` | Feito automaticamente | gerado pelo projeto (ver `.env`) |
| `SMTP_HOST` | Feito automaticamente | `smtp.gmail.com` |
| `SMTP_PORT` | Feito automaticamente | `587` |
| `SMTP_SECURE` | Feito automaticamente | `false` |
| `SMTP_USER` | Feito automaticamente | `smpsandro1239@gmail.com` |
| `MAIL_FROM` | Feito automaticamente | `Boca Maldita <smpsandro1239@gmail.com>` |
| `SMTP_PASS` | **TU (passo 1)** | — |
| `TURSO_URL` | **TU (passo 2)** | — |
| `TURSO_AUTH_TOKEN` | **TU (passo 2)** | — |

---

## Passo 1 — `SMTP_PASS` (palavra-passe de app do Gmail)

Sem isto, os emails de confirmação de reserva são **ignorados silenciosamente**.

1. Abrir https://myaccount.google.com/security
2. Ativar em **Verificação em 2 passos** (indispensável, a Google exige para palavras-passe de app).
3. Pesquisar **"Palavras-passe de app"** (ou https://myaccount.google.com/apppasswords).
4. Criar nova app com o nome `boca-maldita`.
5. Copiar a palavra-passe gerada (16 caracteres, com espaços — **tirar os espaços**).
6. Colar no `SMTP_PASS` do ficheiro `.env` local **e** na Vercel (passo 3).

Exemplo: a Google mostra `abcd efgh ijkl mnop` → colar `abcdefghijklmnop`.

> ⚠️ A palavra-passe normal do Gmail **não** funciona — tem de ser a de app.
> Se a conta não tiver nome de utilizador próprio no Gmail fora domínios @gmail.com, o `SMTP_USER` mantém-se `smpsandro1239@gmail.com`.

---

## Passo 2 — `TURSO_URL` e `TURSO_AUTH_TOKEN` (base de dados persistente)

Sem isto, em produção as reservas/settings são guardadas **em memória** e perdem-se em cold starts.

1. Criar conta em https://turso.tech (grátis, Login with GitHub/Google).
2. Clicar em **Create database** (dashboard).
3. Dar um nome (ex.: `boca-maldita`) e criar.
4. Copiar o **URL** mostrado (ex.: `libsql://boca-maldita-XXXX.turso.io`) → é o `TURSO_URL`.
5. Nas opções da base, abrir **Tokens** e clicar em **Generate Token** → criar → copiar o token (`eyJ...`) → é o `TURSO_AUTH_TOKEN`.
6. Colar ambos no `.env` local **e** na Vercel (passo 3).

> O token começa normalmente por `eyJ` e só aparece uma vez — guardar logo.

---

## Passo 3 — Colocar na Vercel

### Opção A — Dashboard (sem terminal)

1. https://vercel.com/smpsandro1239s-projects/bmaldita → **Settings** → **Environment Variables**.
2. **Add New** para cada variável: nome = valor (do `.env`).
3. Escolher **All Environments** (ou só Production).
4. **Save** → **Redeploy** para as alterações entrarem em vigor (botão *Redeploy* no Deployment atual, ou um novo push).

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
# depois de criares os passos 1 e 2:
echo "VALOR" | npx vercel env add SMTP_PASS production
echo "VALOR" | npx vercel env add TURSO_URL production
echo "VALOR" | npx vercel env add TURSO_AUTH_TOKEN production
```

Ver com: `npx vercel env ls production`

---

## Como verificar

- `curl https://bmaldita.vercel.app/api/admin/assets` → deve responder `{"enabled":true,...}` (deixou de ser `false`) depois do `ADMIN_TOKEN`.
- Criar uma reserva no site e confirmar que recebe o email (após `SMTP_PASS`).
- Após `TURSO_URL`/token: fazer uma reserva, esperar ~1 minuto (cold start) e confirmar que os dados persistem.