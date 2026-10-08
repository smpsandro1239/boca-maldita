# Email — envio, leitura de logs, troubleshooting

Operação do envio de email. Decições de *porquê* estão em
[docs/decisions.md](decisions.md); procedimentos de deploy em
[GUIA-DEPLOY.md](../GUIA-DEPLOY.md).

---

## Variáveis

Todas são lidas em `server/lib/email.ts` a partir do ambiente.

| Variável | Função |
| --- | --- |
| `SMTP_HOST` | **A chave de tudo.** Vazio → nenhum email sai (ver "Silêncio legítimo") |
| `SMTP_PORT` | Omissão `587` |
| `SMTP_SECURE` | `true` só para porta 465; omissão `false` (STARTTLS) |
| `SMTP_USER` | Utilizador; se ausente, liga sem `auth` |
| `SMTP_PASS` | Palavra-passe — ver [SMTP_PASS em produção](#smtp-pass-em-produção--por-confirmar) |
| `MAIL_FROM` | Remetente visível (`Nome <email>`) |
| `SITE_CONTACT_EMAIL` | Caixa do administrador — onde vão as notificações |

Sem `SMTP_HOST`, as reservas **continuam a ser gravadas**. Só o email é que não sai.

---

## Como funciona o envio

O envio **não está no caminho crítico** da resposta.

`server/lib/app.ts` chama `waitUntil(...)` de `@vercel/functions` **antes** de mandar a
resposta, e responde a seguir:

```
storage.createReservation(...)      →  grava
waitUntil(Promise.all([...envios])) →  dispara e não espera
res.status(201).json(...)           →  responde de imediato
```

`waitUntil` mantém a função serverless viva o tempo suficiente para a promise terminar,
mesmo depois de a resposta ter saído. **Fora da Vercel não lança** — em dev local a
promise corre até ao fim do mesmo modo, sem código condicional.

Pontos onde é usado (3, todos públicos):

| rota | o que envia |
| --- | --- |
| `POST /api/reservations` | confirmação ao cliente **+** notificação ao admin (um único `waitUntil` com `Promise.all`) |
| `POST /api/contacts` | notificação de contacto |
| `POST /api/newsletter` | email de boas-vindas |

**Excepção:** `POST /api/admin/closed-days` faz `await` directo do alerta de conflito
**antes** do `201`. É admin, é raro, e a função nunca lança (o `catch` interno devolve
`false`), por isso não parte nada — mas o tempo de envio fica na resposta do admin. Se um
dia se notar lentidão ao criar datas fechadas com conflito, é este o sítio.

Timeouts do transporter: `connectionTimeout` 8 s, `greetingTimeout` 8 s, `socketTimeout`
15 s. São estes que limitam o pior caso do `await` acima.

---

## Como ler os logs

> **`--query` sozinho não chega.** Alcança apenas um *buffer* recente e devolve
> `No logs found` para linhas que existem. É a forma mais comum de concluir "o email não
> enviou" sem que isso seja verdade.

O caminho fiável é ir **ao deployment específico**, com volume:

```bash
# descobrir o deployment
MSYS_NO_PATHCONV=1 npx vercel@59.26.0 ls --prod --limit 3

# logs desse deployment, com folga
MSYS_NO_PATHCONV=1 npx vercel@59.26.0 logs <url-do-deployment> -n 1000
```

Para confirmar **erros**, acrescentar `--level error` — é aí que aparecem os
`console.error`. A ausência de linhas com `--level error` é informação: significa que
nenhum `catch` correu.

`MSYS_NO_PATHCONV=1` é obrigatório em Git Bash (mesma razão que no
[GUIA-DEPLOY.md §2](../GUIA-DEPLOY.md)).

### Mensagens que os logs podem conter

| tipo | texto |
| --- | --- |
| sucesso | `[email] Confirmação enviada BM-0032 -> ...` |
| sucesso | `[email] Notificação de reserva enviada BM-0032 -> ...` |
| sucesso | `[email] Notificação de contacto enviada -> ...` |
| sucesso | `[email] Boas-vindas do boletim enviada -> ...` |
| sucesso | `[email] Alerta de conflito enviado N reserva(s) ...` |
| erro (interno) | `[email] Erro ao enviar confirmação:` / `... notificação de reserva:` / `... boas-vindas do boletim:` |
| erro (externo) | `[email] Falha no envio de confirmação:` / `... notificação de contacto:` |
| SMTP desligado | `[email] SMTP não configurado — confirmação de reserva não enviada.` |

Os erros aparecem em **duas camadas**: o `catch` interno de cada função (`Erro ao enviar`)
e um `.catch` exterior em `server/lib/app.ts` (`Falha no envio`). O exterior é defensivo — as
funções nunca lançam, por isso normalmente não deve aparecer.

---

## Troubleshooting

**Silêncio legítimo.** `SMTP_HOST` vazio → `getTransporter()` devolve `null` e cada função
faz `console.warn('[email] SMTP não configurado — ...')` e devolve `false`. Sem enviar,
sem erro. Em dev local com `.env.example` isto é o comportamento esperado.

**Silêncio absoluto.** Não há sequer `SMTP não configurado`. Significa que **o envio nunca
correu** — a rota não foi atingida, ou a função não chegou ao email. Aí sim, suspeitar da
infraestrutura, não do SMTP.

**Erro capturado.** Há `Erro ao enviar ...` → o SMTP foi contactado e recusou (credencial,
host, timeout). O `err` vem logo a seguir à mensagem.

**Cadeia inteira, provada.** O `BM-0032` percorreu formulário → API → SMTP → entrega nos
dois destinatários, com log de sucesso em ambos. Foi o fim da investigação do
"não envia email": **o problema nunca foi o código.**

---

## `SMTP_PASS` em produção — por confirmar

| | produção (Vercel) | local (`.env`) |
| --- | --- | --- |
| comprimento | 11 caracteres | 16 caracteres |
| formato | tem caracteres não-alfanuméricos | alfanumérico |

Uma app password do Gmail tem 16 caracteres. A de produção **não tem esse formato** e não
é prefixo nem sufixo da local.

Apesar disso **funciona**: sem `console.error` nos logs e com entrega verificada.

**Estado: por confirmar.** Ler no dashboard da Vercel (o CLI não serve). Enquanto isso,
registar como "funciona, formato desconhecido" — se um dia deixar de funcionar, este é o
primeiro suspeito e não se perde tempo no código.

---

## Verificar depressa

```bash
# a API está de pé?
curl -sI https://bmaldita.vercel.app/api/health

# SMTP está ligado em produção? (vazio = sem envio)
# ler as variáveis no dashboard: Settings → Environment Variables
```

Fim a fim, o teste único é submeter uma reserva real e confirmar a linha
`[email] Confirmação enviada <referência>` nos logs do deployment.
