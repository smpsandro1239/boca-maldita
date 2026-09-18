# Boca Maldita — Fine Dining & Grill

Website oficial do restaurante **Boca Maldita**, em Vila de Prado, Vila Verde. Teatro culinário com mestria no fogo nobre, carnes maturadas seletas e alta hospitalidade no coração do Minho.

**Em produção:** https://bmaldita.vercel.app

## Stack

- **Frontend:** React 19, TypeScript, Vite 6, Tailwind CSS 4, lucide-react
- **Backend:** Node.js + Express 4, validação com Zod, confirmações por email (nodemailer)
- **Base de dados:** SQLite local (`node:sqlite`) em dev; **Turso** (SQLite alojado) em produção/Vercel
- **Deploy:** Vercel (frontend estático + função serverless `/api`)

## Como correr localmente

Pré-requisitos: Node.js >= 20.

1. Instalar dependências:

   ```bash
   npm install
   ```

2. Configurar variáveis de ambiente:

   ```bash
   cp .env.example .env
   ```

   Os valores por omissão funcionam para dev; preencha `SMTP_*` para ativar os emails de confirmação e `ADMIN_TOKEN` para o painel de administração.

3. Arrancar frontend + backend em desenvolvimento:

   ```bash
   npm run dev
   ```

   - Frontend (Vite): http://localhost:3000
   - API (Express): http://localhost:3001
   - Em dev, o Vite faz proxy de `/api` para o backend em `:3001`.

## Scripts

| Comando            | Descrição                                          |
| ------------------ | -------------------------------------------------- |
| `npm run dev`      | Arranca API e frontend em paralelo (Vite + tsx watch) |
| `npm run dev:web`  | Apenas frontend (Vite)                             |
| `npm run dev:api`  | Apenas API (tsx watch)                             |
| `npm run build`    | Compila o frontend para `dist/`                     |
| `npm start`        | Serve a API (e o `dist/` se existir) em produção     |
| `npm run lint`     | Verificação de tipos (tsc --noEmit)               |
| `npm run typecheck`| Alias de `lint`                                    |
| `npm run clean`    | Remove artefactos de build (`dist/`, `.vercel/`)    |

## Estrutura

```
api/lib/       # Backend Express + armazenamento (dentro de api/ para a função serverless ser autossuficiente)
  app.ts       # Fábrica da aplicação (rotas, admin, email) — usada em local e Vercel
  storage.ts   # Camada de dados: SQLite local ou Turso (automático por variáveis)
  email.ts     # Envio de confirmações de reserva (SMTP, opcional)
  validation.ts# Schemas Zod
api/index.ts   # Função serverless (Vercel)
server/index.ts# Arranque do servidor Express local
src/           # Frontend React
scripts/       # Utilitários (clean)
vercel.json    # Configuração de deploy Vercel
```

## API

- `GET /api/health` — estado do servidor
- `GET /api/site` — definições públicas do site (`contactEmail`)
- `PUT /api/site` — atualizar email de contacto em todo o site (requer `X-Admin-Token`)
- `POST /api/reservations` — registar pedido de reserva (envia email de confirmação se SMTP configurado)
- `POST /api/contacts` — registar mensagem de contacto
- `POST /api/newsletter` — subscrever boletim exclusivo
- `GET /api/admin/assets` — ler substituições de imagens publicadas
- `PUT /api/admin/assets` — publicar imagens substituídas (requer `X-Admin-Token`)
- `DELETE /api/admin/assets` — repor imagens originais (requer `X-Admin-Token`)

## Painel de administração (imagens)

As imagens atuais são placeholders trocáveis a qualquer momento, sem recompilar o site. Use o botão flutuante **“Painel de Imagens”** (canto inferior direito):

1. Alterar o link de uma imagem aplica a mudança em tempo real.
2. Para publicar para todos os visitantes, insira o `ADMIN_TOKEN` e clique em **Guardar no servidor** (o token fica guardado na sessão do navegador).
3. As substituições persistem na base de dados (Turso em produção) e são devolvidas em `GET /api/admin/assets`.

O painel permite ainda substituir o **email de contacto do site** (por omissão `smpsandro1239@gmail.com`), que é aplicado globalmente — rodapé, contactos e restantes secções.

> Para disponibilizar um vídeo oficial do "documentário", defina `DOCUMENTARY_VIDEO_URL` em `src/data/assets.ts` com o link `.mp4` — o modal passa a usar um player nativo.

## Deploy na Vercel

O projeto está ligado ao repositório GitHub: cada push para `main` é publicado automaticamente.

1. Em Settings > Environment Variables do projeto, defina em produção:
   - `ADMIN_TOKEN` — token usado pelo painel de administração
   - `TURSO_URL` e `TURSO_AUTH_TOKEN` — base de dados persistente
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` — confirmações por email
   - `SITE_CONTACT_EMAIL` — email de contacto global (opcional; por omissão `smpsandro1239@gmail.com`)
   - `APP_URL` — `https://bmaldita.vercel.app`
   - `DB_PATH` — não é preciso em produção (o Turso sobrepõe-se)

2. Criar a base Turso (uma vez):

   ```bash
   npm i -g turso
   turso auth login
   turso db create boca-maldita
   turso db show boca-maldita   # copiar URL
   turso db tokens create boca-maldita  # copiar token
   ```

   Colar os valores em `TURSO_URL` e `TURSO_AUTH_TOKEN` na Vercel.

3. `vercel.json` compila o frontend para `dist/` e reencaminha `/api/*` para a função serverless `api/index.ts`. O restante é servido como SPA (`/index.html`).

## Email de confirmação

Sem `SMTP_HOST` não é enviado qualquer email (as reservas continuam a ser gravadas). Com SMTP configurado, cada reserva gera um email HTML com a referência `BM-XXXX`, data, hora e detalhes.

## Autor

Sandro Pereira Dev