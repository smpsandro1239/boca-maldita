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
- `reviews` — avaliações dos clientes (ficam `pending` até aprovação no painel).
- `closed_periods` — datas fechadas (dia único ou intervalo com repetição semanal/anual).
- `settings` — pares `chave → JSON`, do painel de administração:
  - `menu_items` → o menu (pratos, preços, visibilidade, ordem);
  - `site_content` → contactos, textos, redes sociais, vídeo;
  - `image_asset_overrides` → logótipo e ajustes (escala/posição) das imagens;
  - `admin_token` → o token do painel (se definido, sobrepõe-se ao `ADMIN_TOKEN` do ambiente).

> Acessório importante: se **não** houver `TURSO_URL`/`TURSO_AUTH_TOKEN`, em produção cai em memória (e avisa no log: `[storage] VERCEL sem Turso configurado — a usar armazenamento em memória (não persistente)`). **Sempre** configurar Turso para ter persistência.

### 4.4. Como consultar a base de dados

Os dados estão todos no SQLite da Turso. Para os ver, tens três caminhos (o 1º e o 2º são os principais).

#### Opção 1 — Dashboard da Turso (no navegador, sem instalar nada)

1. https://turso.tech → **Databases** → **boca-maldita**.
2. No separador/consola de **Query** (editor de SQL incorporado) escreves e executas as consultas; as tabelas aparecem do lado esquerdo.

Isto funciona em qualquer sistema (Windows incluído) — é útil para espreitar valores sem instalar software.

#### Opção 2 — CLI oficial (`turso db shell`)

CLI disponível em **Mac/Linux/WSL** (para Windows nativo usa a Opção 1 ou WSL):

```bash
# Instalar (uma vez)
curl -sSfL https://get.tur.so/install.sh | bash

# Entrar e autenticar (uma vez)
turso auth login

# Sessão interativa — escreves consultas à vez
turso db shell boca-maldita

# Consulta única, devolve e sai
turso db shell boca-maldita "SELECT * FROM reservations;"
```

#### Consultas úteis para este projeto

```sql
-- Listar tabelas e o esquema
.tables
.schema

-- Reservas (as do painel de administração)
SELECT id, reference, name, date, time, guests, created_at
FROM reservations
ORDER BY created_at DESC;

-- Mensagens de contacto
SELECT id, nome, email, assunto, created_at FROM contacts ORDER BY created_at DESC;

-- Subscritores da newsletter
SELECT id, email, created_at FROM newsletter ORDER BY created_at DESC;

-- Settings do painel (menu, conteúdo, imagem/logótipo)
SELECT key, substr(value, 1, 120) AS valor FROM settings;
```

Cada linha da tabela `settings` guarda o JSON completo de uma chave (`menu_items`, `site_content`, `image_asset_overrides`) — para ler tudo usa `SELECT key, value FROM settings;`.

> **Backups:** `turso db shell boca-maldita .dump > dump.sql` cria uma fotografia SQL completa da base (para restaurar: `turso db shell boca-maldita < dump.sql`). Recomendo guardar um dump de vez em quando.

#### Opção 3 — API do próprio site

Sem acesso à conta Turso, dá para ler os dados via API pública:
`https://bmaldita.vercel.app/api/menus` e `.../api/site-content` (públicos), e as listas do painel `.../api/admin/reservations|contacts|newsletter` (com o header `X-Admin-Token`).

### 4.5. Como obter o URL e o token (se um dia precisares de regenerar)

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

### 4.6. Rodar de outro local com a MESMA base de dados

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

### 6.5. Usar o teu próprio domínio (ex.: `bocamaldita.pt`)

**Custos:** adicionar um domínio próprio na Vercel é **grátis no plano Hobby** (inclui até 50 domínios por projeto e certificado SSL automático). O **único** custo é a **própria inscrição do domínio** no registar (já tens `bocamaldita.pt`) e a sua renovação anual — nada é cobrado pela Vercel.

> ⚠️ **Não basta mudar o `.env`.** O `.env` local só afeta o teu computador (dev). Para produção é preciso (a) adicionar o domínio na Vercel, (b) apontar o DNS, e (c) atualizar a variavel `APP_URL` **na Vercel** e fazer redeploy. No código **não existe** nenhum endereço fixo do site (verificado: só a env var `APP_URL` é usada, pelo CORS), portanto **não há mais nada para alterar**.

#### Passo a passo (o mais simples — forma A: DNS da Vercel)

1. **Vercel → Projeto `bmaldita` → Settings → Domains → «Add»** e escreve `bocamaldita.pt` (se quiseres, adiciona também `www.bocamaldita.pt`).
2. No painel de **DNS.PT** (registar oficial de `.pt` onde geres o domínio), muda os **nameservers** para os que a Vercel mostra (ex.: `ns1.vercel-dns.com`, `ns2.vercel-dns.com`).
3. Aguarda a propagação (minutos a algumas horas). A Vercel verifica sozinha, marca o domínio como **Valid Configuration** e emite o certificado SSL gratuitamente.

> ⚠️ **Forma A substitui todo o teu DNS (email, outros serviços)** desse domínio. Se o `bocamaldita.pt` já for usado para email (MX, SPF) ou outros serviços, prefere a **forma B**.

#### Forma B — manter o teu DNS atual (menos disruptiva, recomendada se o domínio já tem email/serviços)

1. **Vercel → Settings → Domains → Add** `bocamaldita.pt` (+ `www.bocamaldita.pt`).
2. No painel do registar (DNS.PT), adiciona um **registo A** para o domínio principal e para `www` com o endereço IP que a Vercel mostra (tipicamente `76.76.21.21`), ou um **CNAME** `www` → `cname.vercel-dns.com`.
3. Se a Vercel pedir **verificação TXT** (acontece em domínios `.pt` / domínios registados noutro local), adiciona o registo **TXT** indicado no registar e clica em **Verify**.
4. Quando o estado aparecer **Valid Configuration**, o domínio está ativo.

#### SSL — não precisas de fazer nada

- O **certificado SSL é automático, gratuito e renovado sozinho** pela Vercel (não tens de comprar, carregar nem renovar nada) — em qualquer domínio, seja `.vercel.app` ou próprio, nas Formas A e B.
- A Vercel só emite o certificado **depois de** o domínio estar a apontar para ela (*Valid Configuration*); até lá o HTTPS fica pendente, mas é só aguardar a propagação do DNS (minutos a algumas horas).
- O HTTPS passa a cobrir `https://bocamaldita.pt` e `https://www.bocamaldita.pt` (e o velho `bmaldita.vercel.app`) automaticamente.

#### Atualizar a APP_URL (depois do domínio ativo)

```bash
npx vercel env add APP_URL production    # valor: https://bocamaldita.pt
npx vercel --prod --yes                  # redeploy para aplicar
```

(O ficheiro `.env` local só importa para desenvolvimento — atualiza-o também se usares CORS em dev.)

#### Depois da troca

- O site continua igual em `http://bmaldita.vercel.app` (a Vercel mantém o alias automático). Para redirecionar o velho domínio para o novo: **Settings → Domains → Redirects** (301) — opcional.
- **Os dados não mudam nada:** toda a informação continua na base Turso.
- **Desfazer:** basta remover o domínio em **Settings → Domains** e reverter `APP_URL` + redeploy.

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

## 8. Custos — o que tem e o que não tem custo

**Situação atual: custo mensal €0** — tudo está em planos gratuitos.

### 8.1. Base de dados Turso — €0/mês

A base `boca-maldita` está no plano **Free** (o dashboard/API mostra `plan_id: starter`, nome interno do gratuito). Limites do Free (verificados 2026):

| Recurso | Limite Free | O nosso uso |
| --- | --- | --- |
| Bases de dados | 100 | 1 |
| Armazenamento | 5 GB | <1 MB |
| Rows lidas / mês | 500 milhões | quase zero |
| Rows escritas / mês | 10 milhões | algumas |
| Syncs / mês | 3 GB | mínimo |

Sem cartão de crédito. Se um limite for excedido no Free, a base **bloqueia** (não cobra). Planos pagos: Developer a partir de **$4.99/mês** (só necessário se cresceres muito).

### 8.2. Hosting Vercel — €0/mês

O projeto `bmaldita` está no plano **Hobby** (grátis, sem faturação). Limites incluídos:

| Recurso | Limite Hobby |
| --- | --- |
| Invocações de função | 1 milhão / mês |
| Active CPU | 4 CPU-horas / mês |
| Memória provisionada | 360 GB-hrs / mês |
| Transferência de dados | 100 GB / mês |
| Builds | 6.000 min / mês |
| Domínios por projeto | 50 (grátis) |

No Hobby não há faturação em excesso: exceder limites pausa funcionalidades até ao ciclo seguinte. Pro paga-se apenas se quiseres (a partir de $20/mês).

### 8.3. Tudo de que o projeto depende

| Dependência | Papel | Custo hoje | Quando começaria a custar |
| --- | --- | --- | --- |
| Turso (base) | Base de dados | **Grátis** | Exceder limites Free → plano pago $4.99/mo |
| Vercel (hosting) | Site + API | **Grátis** (Hobby) | Exceder limites/funcionalidades → Pro $20/mo |
| Domínio `bocamaldita.pt` | Endereço próprio | Já teu (inscrição + renovação anual no registar) | Renovação anual no DNS.PT |
| Domínio `*.vercel.app` | Endereço automático | **Grátis** | — |
| GitHub | Repositório e git | **Grátis** | — |
| Gmail (SMTP) | Envio de emails | **Grátis** | — |
| GitHub/Google (login) | Contas | **Grátis** | — |
| Certificado SSL | HTTPS | **Grátis** (Vercel/Let's Encrypt) | — |
| Node.js + npm (express, react, vite, @libsql/client, nodemailer…) | Stack | **Grátis** (open source) | — |
| CLI Turso / Docker | Ferramentas de criação/consulta (usadas aqui) | **Grátis** | — |

### 8.4. Custos potenciais (opcionais, não atuais)

- **Renovação do domínio** `bocamaldita.pt` — já é teu; custo de renovação no registar (DNS.PT), ex.: ~10€/ano.
- **VPS** (opção de self-hosting, secção 7) — ver tabela de preços em 8.5; hoje não usamos.

### 8.5. Opções de VPS na faixa de 3–10€/mês

Preços indicativos (sem IVA) verificados em setembro 2026 — confirmar no site antes de comprar (alguns têm IVA à parte e promoções só no 1.º ano). Qualquer uma destas chega de sobra para este projeto (server pequeno: Node + nginx/servir `dist/`).

| Empresa | Produto / Plano | Preço | Link |
| --- | --- | --- | --- |
| **Hetzner** | Cloud `CX23` — 2 vCPU, 4 GB RAM, 40 GB NVMe, 20 TB | €5.99/mês | https://www.hetzner.com/cloud |
| **Contabo** | Cloud VPS S (Core) — 4 vCPU, 8 GB RAM, 100+ GB | ~€4.50–5.50/mês | https://contabo.com/en/vps/ |
| **OVHcloud** | VPS Starter — 2 vCPU, 2 GB RAM, 40 GB | ~€3.50–4.50/mês | https://www.ovhcloud.com/pt/vps/ |
| **Hostinger** | VPS KVM 1 — 1 vCPU, 4 GB RAM, 50 GB | ~€4–6/mês (promo 1.º ano) | https://www.hostinger.pt/vps-hosting |
| **DigitalOcean** | Basic 1 GB — 1 vCPU, 1 GB RAM, 25 GB, 1 TB | $6/mês (~€5.5) | https://www.digitalocean.com/pricing |
| **Akamai Linode** | Nanode 1 GB — 1 vCPU, 1 GB RAM, 25 GB, 1 TB | $5/mês (~€4.6) | https://www.linode.com/pricing |
| **Vultr** | Cloud Compute — 1 vCPU, 1 GB RAM, 25 GB | $6/mês (~€5.5) | https://www.vultr.com/pricing |
| **Netcup** | VPS 1000 — 1 vCPU, 2 GB RAM, 100 GB | €3.49/mês | https://www.netcup.com/en/server/vps |

> Recomendação para este projeto: **Hetzner** ou **Contabo** sobem o melhor preço/desempenho e estão na UE. Nota: à exceção da Vercel, num VPS também tens de tratar tu do certificado SSL — é fácil e grátis com o **Let's Encrypt**. E lembra-te: a Vercel continua **€0** — por isso um VPS só compensa se quiseres mesmo sair da Vercel ou aumentar o controlo.

---

## 9. Checklist final "rodar do zero noutro local"

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

## 10. Resolução de problemas

| Sintoma | Causa provável | Solução |
| --- | --- | --- |
| Logs: `[storage] VERCEL sem Turso configurado — memória` | `TURSO_URL`/`TURSO_AUTH_TOKEN` em falta na Vercel | Adicionar as env vars e fazer redeploy (secção 6.2) |
| Email: `535 Username and Password not accepted` | `SMTP_PASS` errado / com espaços / letra em falta | A app password tem de ter exatamente **16 caracteres sem espaços** (secção 5) |
| `ESOCKET` ao enviar email em casa | Rede local bloqueia `smtp.gmail.com:587` | Testar via Vercel/outra rede; o servidor de produção não tem este bloqueio |
| API diz "Required" em alguns campos | Validação zod (campos obrigatórios: `id`, `category`, `price` numérico, `description`, `imageUrl`, etc.) | Usar o painel; os formatos são os definidos em `api/lib/validation.ts` |
| Emails chegam à pasta Spam | Autenticação de remetente (SPF/DKIM) do Gmail | É normal neste setup com `MAIL_FROM` via Gmail; não bloqueia o funcionamento |
| `vercel env rm SМTP_PASS` pede confirmação | Remoção interativa | Usar `--yes` |
| Logs com `DEP0169 url.parse()` | Warning de dependência do node (cosmético) | Ignorar — não afeta o funcionamento |
| Domínio próprio não fica *Valid Configuration* / a API devolve CORS | DNS ainda a propagar, ou `APP_URL` em falta na Vercel | Aguardar DNS e repetir; depois atualizar `APP_URL` na Vercel + redeploy (secção 6.5) |

---

## 11. Comandos úteis

```bash
npm run dev              # dev local (API 3001 + site 3000)
npm run build            # compila dist/ + api/index.js
npm run lint             # verificação de tipos (tsc --noEmit)
npm run start            # corre só a API (dev)
npx vercel env ls production        # lista env vars da produção
npx vercel logs https://bmaldita.vercel.app   # logs da produção
npx vercel --prod --yes  # redeploy
turso db shell boca-maldita         # consultar a base (ver secção 4.4)
```

---

## 12. Segurança — regras de ouro

1. **Nunca commitar** `.env`, `.env.local` nem segredos (estão no `.gitignore`; `.env.example` é o único modelo público).
2. O `TURSO_AUTH_TOKEN` e a app password do Gmail são segredos — só no `.env`/Vercel.
3. Se algum token vazar: **Turso** → *Invalidate tokens* (gira novos); **Gmail** → apagar a app password e criar outra.
4. O `ADMIN_TOKEN` protege o painel; mantém-no longo e privado. O acesso é feito pela URL `https://<site>/admin` (gera um ecrã de login com o token); o site público **não mostra** nenhum botão de acesso ao painel. O token pode ser **trocado no próprio painel** (separador **Segurança**, exige o token atual e uma política forte) — o novo fica guardado na base Turso e sobrepõe-se ao `ADMIN_TOKEN` do ambiente.