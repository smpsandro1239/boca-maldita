# Guia completo — Correr / Lançar o Boca Maldita noutro computador ou VPS

Este guia explica, passo a passo e do zero, como rodar este projeto **noutro local**: noutro computador, num VPS, ou num servidor caseiro. Inclui uma secção detalhada sobre a **base de dados (Turso)** que acabámos de criar — porque existe, como aceder e como usá-la a partir de qualquer máquina.

---

## 1. Visão geral do projeto

O site do Boca Maldita é uma aplicação com duas partes:

| Parte | Tecnologia | Função |
| --- | --- | --- |
| **Frontend** | Vite + React (pasta `src/`) | O site que o utilizador vê |
| **Backend/API** | Express (pastas `api/` e `server/`) | Reservas, contactos, newsletter, painel de administração |
| **Base de dados** | Turso (SQLite na nuvem) | Guarda reservas, settings do painel, imagens, menu |

Em produção de hoje:
- Frontend + API correm na **Vercel** (`https://bmaldita.vercel.app`).
- Os dados vivem na **Turso** (nuvem) — não na Vercel. Isto é o segredo para poderes **rodar o sistema de qualquer outro local** usando **a mesma base de dados**.

---

## 2. Pré-requisitos (qualquer máquina nova)

- Node.js **20 ou superior** (inclui `npm`).
- `git` (para clonar o repositório).
- Conta **Turso** criada com o teu GitHub/Google (já feita: org `smpsandro1239`).
- Base de dados Turso já criada (já feita: nome `boca-maldita`).
- Opcional: `npx vercel` para deploy na Vercel (não é preciso para rodar localmente).

---

## 3. Correr em desenvolvimento (num computador novo)

Tudo o que precisas é de um terminal, o código e o ficheiro `.env`.

### 3.1. Clonar e instalar

```bash
git clone https://github.com/smpsandro1239s-projects/bmaldita.git   # ou o teu repositório
cd boca-maldita
npm install
```

### 3.2. Criar o `.env`

O ficheiro `.env` **não está versionado** (é gitignored) — por isso cada máquina cria o seu a partir do modelo:

```bash
cp .env.example .env
```

Depois **abre o `.env`** e preenche os valores. Podes copiá-los do `.env` que já existe no computador de origem (ver secção 5 com a explicação de cada variável). Não partilhes nem commites este ficheiro.

### 3.3. Arrancar

```bash
npm run dev
```

- API corre em `http://localhost:3001` (fase do Express, configurado via `PORT`).
- Site corre em `http://localhost:3000` (Vite).
- Abre `http://localhost:3000` no navegador.

O `.env` é carregado automaticamente (`api/lib/app.ts` importa `dotenv/config`). **Não precisas de instalar nada da Turso em disco** — a ligação é feita via internet com URL + token (secção 4).

---

## 4. A base de dados Turso — em detalhe

### 4.1. Porquê Turso?

Sem base de dados, produção usava **memória do servidor**: depois de cada "cold start" (reinício), tudo — reservas, alterações do painel, menu — desaparecia. A Turso é um **SQLite hospedado na nuvem**: rápido, gratuito para o nosso volume e acessível de **qualquer máquina** desde que tenhas o URL + o token.

### 4.2. O que já foi criado (hoje)

| Item | Valor |
| --- | --- |
| Conta / organização | `smpsandro1239` (pessoal) |
| Nome da base | `boca-maldita` |
| URL da base (`TURSO_URL`) | `libsql://boca-maldita-smpsandro1239.aws-eu-west-1.turso.io` |
| Região | `aws-eu-west-1` (EU, Irlanda) |
| Token de acesso (`TURSO_AUTH_TOKEN`) | token `eyJ...` gerado com permissão de leitura **e** escrita (rw) |

> O **token** é um segredo. Ele está guardado no `.env` (e na Vercel como *Secret*). **Nunca** o pôr num ficheiro versionado, num chat público, ou num screenshot.

### 4.3. O que o sistema guarda lá

O código (`api/lib/storage.ts`) cria o esquema **automaticamente na primeira utilização** (`CREATE TABLE IF NOT EXISTS`). Não há migrações manuais. Tabelas e chaves:

- `reservations` — reservas do site e listagem no painel.
- `contacts` — mensagens do formulário de contactos.
- `newsletter` — subscritores da newsletter.
- `settings` — pares `chave → JSON`, do painel de administração:
  - `menu_items` → o menu (pratos, preços, visibilidade, ordem);
  - `site_content` → contactos, textos, redes sociais, vídeo;
  - `image_asset_overrides` → logótipo e ajustes (escala/posição) das imagens.

> Acessório importante: se **não** houver `TURSO_URL`/`TURSO_AUTH_TOKEN`, em produção cai em memória (e avisa no log: `[storage] VERCEL sem Turso configurado — a usar armazenamento em memória (não persistente)`). **Sempre** configurar Turso para ter persistência.

### 4.4. Como obter o URL e o token (se um dia precisares de regenerar)

**Opção A — Dashboard (recomendado, funciona em qualquer sistema):**

1. Entra em https://turso.tech (login com GitHub/Google).
2. Painel → **Databases** → abre `boca-maldita`.
3. O **URL** aparece no topo (copia → `TURSO_URL`).
4. No separador **Tokens** → **Generate Token** → escolhe permissão de leitura+escrita → cria → vais ver **uma única vez** um token `eyJ...` → copia e guarda imediatamente (`TURSO_AUTH_TOKEN`).

**Opção B — CLI oficial (Mac/Linux/WSL):**

```bash
curl -sSfL https://get.tur.so/install.sh | bash
turso auth login
turso db show boca-maldita          # mostra o URL
turso db tokens create boca-maldita # imprime o token "eyJ..." (só aparece uma vez)
```

> **Nota Windows nativo:** o CLI oficial **não tem build nativa para Windows** (apenas para `tursodb`, a shell SQL). É por isso que na máquina Windows de origem usámos um container Docker/Linux para criar a base. No dia-a-dia, o **painel web** (Opção A) resolve tudo sem instalar nada.

### 4.5. Rodar de outro local com a MESMA base de dados

Como a base vive na nuvem, um computador novo **não faz cópias, liga-se** à mesma base:

1. Clona o projeto (secção 3.1).
2. Preenche o `.env` com **o mesmo** `TURSO_URL` e **o mesmo** `TURSO_AUTH_TOKEN`.
3. `npm run dev`.

Qualquer reserva criada no site novo aparece no painel do site antigo e vice-versa — é a **mesma base de dados**. Isto também significa: cuidado ao apagar. Se quiseres um ambiente de teste separado, cria outra base (ex.: `boca-maldita-test`) e usa esse URL/token noutro `.env`.

---

## 5. Variáveis de ambiente (tabela de referência)

| Variável | Obrigatória? | Para que serve | Onde obter |
| --- | --- | --- | --- |
| `PORT` | Não (3001) | Porta da API local | — |
| `DB_PATH` | Não | Base SQLite local (fallback dev) | `data/boca-maldita.db` |
| `APP_URL` | Sim (produção) | URL público do site (CORS) | `https://bmaldita.vercel.app` |
| `SITE_CONTACT_EMAIL` | Sim | Email de contacto global | `smpsandro1239@gmail.com` |
| `ADMIN_TOKEN` | Sim | Segredo do painel admin (header `X-Admin-Token`) | gerado; igual em todas as máquinas se quiseres o mesmo painel |
| `SMTP_HOST` | Sim | `smtp.gmail.com` | — |
| `SMTP_PORT` | Sim | `587` | — |
| `SMTP_SECURE` | Sim | `false` (STARTTLS na 587) | — |
| `SMTP_USER` | Sim | `smpsandro1239@gmail.com` | — |
| `SMTP_PASS` | Sim | Palavra-passe de app do Gmail (**16 caracteres, sem espaços**) | Conta Google → Segurança → Palavras-passe de app |
| `MAIL_FROM` | Sim | `Boca Maldita <smpsandro1239@gmail.com>` | — |
| `TURSO_URL` | Sim | URL da base Turso (ver 4.2) | dashboard Turso |
| `TURSO_AUTH_TOKEN` | Sim | Token da base Turso (segredo) | dashboard Turso | 

> `ADMIN_TOKEN` não é um campo do painel: é o segredo de autenticação. Para **partilhar os mesmos dados de reserva** entre máquinas, o que interessa é o **Turso**; o `ADMIN_TOKEN` apenas tem de ser igual se quiseres que ambas as máquinas consigam abrir o mesmo painel.

---

## 6. Lançar em produção na Vercel

Na Vercel o deploy já está feito e funciona; este passo a passo serve para **fazer deploy a partir de outra máquina** ou recriar do zero.

### 6.1. Login e ligação ao projeto

```bash
npx vercel login
npx vercel link          # escolhe "smpsandro1239s-projects/bmaldita"
```

### 6.2. Configurar as variáveis (uma vez)

Já estão todas na Vercel hoje. Para recriar (substituir `VALOR`):

```bash
npx vercel env add APP_URL production preview
npx vercel env add SITE_CONTACT_EMAIL production  preview
npx vercel env add ADMIN_TOKEN production preview
npx vercel env add SMTP_HOST production preview
npx vercel env add SMTP_PORT production preview
npx vercel env add SMTP_SECURE production preview
npx vercel env add SMTP_USER production preview
npx vercel env add SMTP_PASS production preview
npx vercel env add MAIL_FROM production preview
npx vercel env add TURSO_URL production
npx vercel env add TURSO_AUTH_TOKEN production
```

O comando pede o valor em seguida (ou cola com `echo "VALOR" | npx vercel env add ...`). Os valores ficam como **Secret** na Vercel.

### 6.3. Deploy

```bash
npx vercel --prod --yes
```

Depois de mudar alguma variável de ambiente, é sempre preciso **redeploy** (`npx vercel --prod --yes`) para produzir efeito.

### 6.4. Regras de build (já no `vercel.json`)

- `buildCommand`: `npm run build` → gera `dist/` (site) e `api/index.js` (API empacotada num só ficheiro ESM).
- `outputDirectory`: `dist`.
- Rewrites: `/api/*` → `api`; tudo o resto → `index.html` (SPA).

---

## 7. Alternativa: VPS / computador sempre ligado (self-hosting)

A mesma aplicação pode correr num VPS Linux (ou num PC dedicado), sem Vercel:

### 7.1. Preparar

```bash
git clone <repo> && cd boca-maldita
npm install
cp .env.example .env        # preencher (secções 4 e 5)
npm run build               # compila dist/ + api/index.js
```

### 7.2. Correr a API

```bash
npm start                   # node --import tsx server/index.ts  (Express em $PORT, default 3001)
```

Para produção robusta usa um gestor de processos + reverse proxy. Exemplo com **PM2** e **nginx**:

```bash
npm i -g pm2
pm2 start npm --name boca-api -- start -- -p 3001   # ou: pm2 start server/index.ts
pm2 save && pm2 startup
```

nginx (`/etc/nginx/sites-available/boca`):

```nginx
server {
  listen 80;
  server_name exemplo.pt;

  root /var/www/boca-maldita/dist;
  index index.html;

  location / { try_files $uri $uri/ /index.html; }

  location /api { proxy_pass http://127.0.0.1:3001; proxy_set_header Host $host; }
}
```

> Precisas que `APP_URL` aponte para o teu domínio (ex.: `https://exemplo.pt`), senão o CORS da API bloqueia chamadas do navegador.

### 7.3. Persistência

Continua a ser o **Turso** — nenhuma configuração extra no servidor. As tabelas criam-se na primeira execução. (Se preferires SQLite local no servidor, basta retirar `TURSO_*` do `.env` e o sistema cai na base local em `data/boca-maldita.db`.)

---

## 8. Checklist final "rodar do zero noutro local"

- [ ] Node.js ≥ 20 instalado
- [ ] `git clone` do repositório
- [ ] `npm install`
- [ ] `cp .env.example .env`
- [ ] `.env` com os valores reais (posso copiá-los do computador de origem)
- [ ] Confere que `TURSO_URL` e `TURSO_AUTH_TOKEN` apontam para `boca-maldita` (secção 4.2)
- [ ] `npm run dev` → abre `http://localhost:3000`
- [ ] Testa uma reserva e vê-a no painel (`/admin`)
- [ ] Confirma que recebes o email de confirmação
- [ ] Produção: `npx vercel --prod --yes` (ou self-host da secção 7)

---

## 9. Resolução de problemas

| Sintoma | Causa provável | Solução |
| --- | --- | --- |
| Logs: `[storage] VERCEL sem Turso configurado — memória` | `TURSO_URL`/`TURSO_AUTH_TOKEN` em falta na Vercel | Adicionar as env vars e fazer redeploy (secção 6.2) |
| Email: `535 Username and Password not accepted` | `SMTP_PASS` errado / com espaços / letra em falta | A app password tem de ter exatamente **16 caracteres sem espaços** (secção 5) |
| `ESOCKET` ao enviar email em casa | Rede local bloqueia `smtp.gmail.com:587` | Testar via Vercel/outra rede; o servidor de produção não tem este bloqueio |
| API diz "Required" em alguns campos | Validação zod (campos obrigatórios: `id`, `category`, `price` numérico, `description`, `imageUrl`, etc.) | Usar o painel; os formatos são os definidos em `api/lib/validation.ts` |
| Emails chegam à pasta Spam | Autenticação de remetente (SPF/DKIM) do Gmail | É normal neste setup com `MAIL_FROM` via Gmail; não bloqueia o funcionamento |
| `vercel env rm SМTP_PASS` pede confirmação | Remoção interativa | Usar `--yes` |
| Logs com `DEP0169 url.parse()` | Warning de dependência do node (cosmético) | Ignorar — não afeta o funcionamento |

---

## 10. Comandos úteis

```bash
npm run dev              # dev local (API 3001 + site 3000)
npm run build            # compila dist/ + api/index.js
npm run lint             # verificação de tipos (tsc --noEmit)
npm run start            # corre só a API (dev)
npx vercel env ls production        # lista env vars da produção
npx vercel logs https://bmaldita.vercel.app   # logs da produção
npx vercel --prod --yes  # redeploy
```

---

## 11. Segurança — regras de ouro

1. **Nunca commitar** `.env`, `.env.local` nem segredos (estão no `.gitignore`; `.env.example` é o único modelo público).
2. O `TURSO_AUTH_TOKEN` e a app password do Gmail são segredos — só no `.env`/Vercel.
3. Se algum token vazar: **Turso** → *Invalidate tokens* (gira novos); **Gmail** → apagar a app password e criar outra.
4. O `ADMIN_TOKEN` protege o painel; mantém-no longo e privado.