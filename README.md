# Boca Maldita — Fine Dining & Grill

Website oficial do restaurante **Boca Maldita**, em Vila de Prado, Vila Verde. Teatro culinário com mestria no fogo nobre, carnes maturadas seletas e alta hospitalidade no coração do Minho.

## Stack

- **Frontend:** React 19, TypeScript, Vite 6, Tailwind CSS 4, lucide-react
- **Backend:** Node.js + Express 4, validação com Zod
- **Base de dados:** SQLite (better-sqlite3)

## Como correr localmente

Pré-requisitos: Node.js >= 20.

1. Instalar dependências:

   ```bash
   npm install
   ```

2. Configurar variáveis de ambiente (opcional em dev, os valores por omissão funcionam):

   ```bash
   cp .env.example .env
   ```

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
| `npm run clean`    | Remove artefactos de build (`dist/`, `dist-server/`) |

## Estrutura

```
server/        # Backend Express + SQLite
  index.ts     # Arranque, middlewares e rotas
  db.ts        # Inicialização da base de dados
  validation.ts# Schemas Zod
src/           # Frontend React
scripts/       # Utilitários (clean)
```

## API

- `GET /api/health` — estado do servidor
- `POST /api/reservations` — registar pedido de reserva
- `POST /api/contacts` — registar mensagem de contacto
- `POST /api/newsletter` — subscrever boletim exclusivo

## Autor

Sandro Pereira Dev