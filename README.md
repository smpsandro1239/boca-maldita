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
| `npm run build`    | Gera `api/index.js` (API serverless num ficheiro único) e compila o frontend para `dist/` |
| `npm start`        | Serve a API (e o `dist/` se existir) em produção     |
| `npm run lint`     | Verificação de tipos (tsc --noEmit)               |
| `npm run typecheck`| Alias de `lint`                                    |
| `npm run clean`    | Remove artefactos de build (`dist/`, `.vercel/`)    |

## Estrutura

```
api/index.js   # Função serverless (Vercel) — gerada por scripts/build-api.mjs (não editar)
api/lib/        # Backend Express + armazenamento (partilhado com o servidor local)
  app.ts       # Fábrica da aplicação (rotas, admin, email) — usada em local e Vercel
  storage.ts   # Camada de dados: SQLite local ou Turso (automático por variáveis)
  email.ts     # Envio de confirmações de reserva (SMTP, opcional)
  validation.ts# Schemas Zod
server/index.ts# Arranque do servidor Express local
src/           # Frontend React (screens/, components/, context/, data/, lib/)
scripts/       # Utilitários (build-api.mjs, clean.mjs, api-entry.ts, smoke-admin.mjs)
vercel.json    # Configuração de deploy Vercel
```

## Credenciais de produção

Veja [credenciais-config.md](credenciais-config.md) para criar `SMTP_PASS` (palavra-passe de app do Gmail) e `TURSO_URL`/`TURSO_AUTH_TOKEN` (base de dados persistente) e colocá-los na Vercel.

## API

- `GET /api/health` — estado do servidor
- `GET /api/site` — definições públicas do site (`contactEmail`)
- `PUT /api/site` — atualizar email de contacto em todo o site (requer `X-Admin-Token`)
- `POST /api/reservations` — registar pedido de reserva (envia email de confirmação se SMTP configurado)
- `POST /api/contacts` — registar mensagem de contacto
- `POST /api/newsletter` — subscrever boletim exclusivo
- `GET /api/menus` — menu publicado (ou `null` se ainda não houver alterações)
- `GET /api/site-content` — conteúdo público (email, contactos, textos, vídeo)
- `GET /api/admin/assets` — ler substituições de imagens publicadas (inclui zoom/posição)
- `PUT /api/admin/assets` — publicar imagens substituídas (requer `X-Admin-Token`)
- `DELETE /api/admin/assets` — repor imagens originais (requer `X-Admin-Token`)
- `GET /api/admin/menus` — ler o menu guardado (requer `X-Admin-Token`)
- `PUT /api/admin/menus` — publicar a carta (requer `X-Admin-Token`)
- `DELETE /api/admin/menus` — repor a carta original (requer `X-Admin-Token`)
- `PUT /api/admin/site-content` — publicar conteúdo/contactos (requer `X-Admin-Token`)
- `GET /api/admin/reservations`, `DELETE /api/admin/reservations/:id` (+ `contacts`, `newsletter`) — gestão de dados (requer `X-Admin-Token`)

## Painel de administração

O botão flutuante **“Administração”** (canto inferior direito) abre o painel completo de gestão do site. Separa-se em:

- **Estado** — contadores de reservas, contactos, newsletter e pratos, com explicação do fluxo.
- **Imagens & Logótipo** — altera o **logótipo** e todas as imagens do site (plano de fundo, salão, pratos, mapa…).
  - Arraste sobre a miniatura para **posicionar** (esquerda/direita/cima/baixo) e use a **roda do rato** (ou os cursores) para fazer **zoom**;
  - O enquadramento aplica-se automaticamente em todo o site (objetos `cover` com `object-position` + `scale`);
  - “Publicar imagens” guarda no servidor para todos os visitantes; “Repor originais” volta aos placeholders.
- **Menu** — gestão completa da carta: adicionar, editar, duplicar posição, ocultar ou eliminar pratos; preço, categoria, foto, descrição, origem, sugestão de vinho e “especial do chef”. Publicar atualiza o site; repor restaura a carta de origem.
- **Reservas / Contactos / Newsletter** — listas de todos os dados recebidos, com remoção.
- **Conteúdo** — email de contacto (aplicado em todo o site), telefone, morada, horário, textos do hero, textos sobre o restaurante, redes sociais e link do vídeo (`.mp4`) do documentário.

As alterações só são visíveis para os visitantes depois de clicar em **Publicar**, o que exige o `ADMIN_TOKEN` (fica guardado na sessão do navegador). Sem `ADMIN_TOKEN` no servidor, o painel mostra o estado “Admin desativado”.

> Para disponibilizar um vídeo oficial do "documentário" também pode colar o link `.mp4` no separador **Conteúdo** do painel (campo “Link do vídeo”).

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

3. `npm run build` gera `api/index.js` (API serverless num ficheiro único) e compila o frontend para `dist/`; `vercel.json` reencaminha `/api/*` para essa função e o restante é servido como SPA (`/index.html`).

## Email de confirmação

Sem `SMTP_HOST` não é enviado qualquer email (as reservas continuam a ser gravadas). Com SMTP configurado, cada reserva gera um email HTML com a referência `BM-XXXX`, data, hora e detalhes.

## Autor

Sandro Pereira Dev