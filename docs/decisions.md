# Decisões — Boca Maldita

Razões que **não se vêem no código**. O `git log` diz *o quê*; este ficheiro diz *porquê*.

Se uma mensagem de commit divergir do que aqui está, **este ficheiro é a fonte de verdade** —
mensagens de commit são história imutável, não contrato.

Não é um changelog e não é um manual de operações. Procedimentos e comandos estão no
[GUIA-DEPLOY.md](../GUIA-DEPLOY.md). Envio de email e leitura de logs estão em
[docs/email.md](email.md).

---

## 1. `SubmitOutcome` é um tipo plano, não uma união discriminada

`src/lib/reservation.ts` define:

```ts
export interface SubmitOutcome {
  reference: string | null;
  error: string | null;
}
```

O padrão "correcto" seria `| { ok: true; reference: string } | { ok: false; error: string }`
para estreitar com `if (r.ok)`. **Não o é, de propósito.**

O `tsconfig.json` do projecto não tem `strict`. Sem ele, `strictNullChecks` fica por
omissão desligado, e nesse modo o TypeScript **não estreita** uniões discriminadas por
literais — `if (r.ok)` não reduz o tipo. Um campo opcional (`reference: string | null`)
comporta-se igual nos dois regimes, por isso é o que está lá.

Com `strict` ligado, este tipo deixa de ser a melhor escolha e a conversa renova-se.
Enquanto isso, **não "corrigir" para união discriminada**: parte o `tsc --noEmit` e o
`npm run verify`.

A razão está também comentada no próprio ficheiro (linhas 37-45), para quem lá chegar
primeiro.

---

## 2. `@vercel/functions` — aceite depois de rejeitado

A primeira objecção a meter `waitUntil` em `dependencies` foi *"é uma dependência da
Vercel, guarda-a para quando corrermos local"*. **Esse argumento era fraco.**

A razão técnica é outra: `scripts/build-api.mjs` usa esbuild com `packages: 'external'`,
o que faz o esbuild **não empacotar** os módulos externos. Se `@vercel/functions` estiver
só em `devDependencies`, o bundle gerado mantém o `import` e o runtime não o resolve. Em
`dependencies`, o `npm install` da Vercel garante-o.

Verificação que fechou a discussão: **`waitUntil()` não lança fora da Vercel.** Corre a
promise até ao fim. Ou seja, em desenvolvimento local o comportamento é o mesmo — não há
código condicional a escrever.

Ver [docs/email.md](email.md) para o que o `waitUntil` resolve.

---

## 3. A medição inicial da latência estava errada

Quando se passou de `await Promise.all(...)` para `waitUntil(...)`, a leitura inicial foi
"7,24 / 7,65 / 8,73 s — o `await` custava segundos".

**Não era o `await`.** Eram *cold starts* do serverless. A comparação é inválida porque
os valores quentes da mesma janela eram `0,36 / 0,47 / 0,50 / 0,58 / 0,78 s`, contra um
GET de baseline de `0,37 s`.

Duas lições, ambas aplicáveis noutras medições:

- nunca comparar um valor obtido com um processo recém-arrancado contra um processo quente;
- **nunca afirmar "antes era ~100 ms" sem o ter medido** — esse número nunca existiu.

O que se prova com isto não é que o `waitUntil` seja mais rápido. É que **o email saiu do
caminho crítico**: o `201` responde à velocidade da função e a promise continua viva.

---

## 4. O `geo` do JSON-LD estava errado, e descobriu-se por contradição

O JSON-LD de `index.html` dizia, no mesmo bloco:

```json
"address": { "addressLocality": "Vila de Prado", "postalCode": "4730-460" },
"geo":     { "latitude": 41.717, "longitude": -8.471 }
```

**O postal e as coordenadas contradiziam-se a seis linhas de distância.** Não foi uma
ferramenta nem um alerta que encontrou isto — foi ler o bloco inteiro.

Verificação das coordenadas antigas (Nominatim, `reverse?lat=41.717&lon=-8.471`):

```
São Mamede, Lourido, Ribeira do Neiva, Vila Verde, Braga, Portugal
```

Cerca de **13,3 km a norte** de Vila de Prado — fora do concelho que o `address` declara.

Verificação das coordenadas novas (`41.5980994, -8.4576139`):

```
Boca Maldita, Avenida do Cávado, Ponte, Vila de Prado, Vila Verde, Braga, 4730-460
amenity: "Boca Maldita"
```

Não "está perto" — **é o restaurante, como ponto de interesse no OpenStreetMap**. É a
confirmação mais forte que o reverse-geocode dá.

As coordenadas certas já existiam no projecto: `src/data/contact.ts` as usava nos links
Waze e Apple Maps. O JSON-LD era a única zona desactualizada.

**Lição:** um bloco de dados estruturados deve ser lido como um todo. A validação de
sintaxe passaria isto — era JSON válido, era `@type: Restaurant`, e apontava para o sítio
errado.

> Não documentado aqui: o *place id* do Google Maps que circula nas mensagens de commit.
> Não está em nenhum ficheiro do repositório e não foi re-verificado — fica de fora até
> ser comprovável a partir do repositório.

---

## 5. A `SMTP_PASS` de produção tem formato estranho e funciona

| | produção (Vercel) | local (`.env`) |
|---|---|---|
| comprimento | 11 caracteres | 16 caracteres |
| caracteres não-alfanuméricos | sim | não |

Uma app password do Gmail tem **16 caracteres**. A de produção não tem esse formato e
**não é um prefixo nem um sufixo** da local — a aritmética dos bytes fecha: não é uma
truncagem.

Apesar disso, **o Gmail não a rejeitou**: não há `console.error` nos logs, e os emails
chegaram de ponta a ponta (confirmação ao cliente + notificação ao administrador,
verificados com o `BM-0032`).

**Estado: por confirmar.** A única leitura fiável é o dashboard da Vercel — não o CLI.
Enquanto não se confirmar, fica registado como "funciona, origem desconhecida": se um dia
deixar de funcionar, o formato estranho é o primeiro suspeito e não se perde tempo a
investigar o código.

Ver [docs/email.md](email.md).

---

## 6. Deploy e escrita de dados são operações diferentes

Um pedido para *"enviar para a Vercel"* autoriza o **deploy do código**. **Não** autoriza
um `PUT` em `/api/admin/*` que altera registos.

Motivo: reversibilidade. Um push desfaz-se com outro push; um `PUT` em `menu_items`
reescreve conteúdo publicado e não tem *undo*. Tratar os dois como o mesmo gesto transforma
um "publica o código" num "publica e altera a base de dados".

A regra vive no [GUIA-DEPLOY.md §6](../GUIA-DEPLOY.md) — inclui a sequência (dizer, esperar
pelo "sim", validar, verificar) e o `menuItemSchema` `.strict()` que faz um campo
desconhecido devolver 400 sem gravar.

Foi escrita **depois** de um `PUT` feito sem autorização específica, em 2026-10-05.

---

## 7. A numeração do GUIA-DEPLOY não se pode mexer

`scripts/migrations/remove-azinho.ts` e `scripts/migrations/rename-menu-executive.ts`
citam literalmente:

> a regra "Escritas de dados em producao exigem autorizacao explicita" na **secção 6** do
> GUIA-DEPLOY.md

Isto faz do GUIA um **contrato referenciado por código**, não só por humanos. Renumerar
secções parte essas referências em silêntio — o comentário deixa de apontar para nada e
ninguém repara até precisar dele.

Por isso: §1-§7 são estáveis. Conteúdo novo entra em secções novas, numeradas a seguir.

---

## 8. Vercel Hobby e uso comercial

O plano **Hobby** da Vercel não cobre uso comercial. Este projecto é o site de um
restaurante a operar — está fora das condições do plano.

| alternativa | nota |
|---|---|
| Vercel Pro | ~20 USD/mês |
| Cloudflare Pages | grátis, mas exige adaptar o backend Express para Workers |

**Estado: analisado, não decidido.** É decisão de negócio, não de código.

> Os termos exactos devem ser relidos na página de planos da Vercel antes de se decidir
> qualquer coisa — esta entrada regista a conclusão da auditoria ao projecto, não a leitura
> das condições em vigor.

---

# Adiados

Marcados como **não implementados** para não serem lidos como funcionalidades existentes.

### CTA WhatsApp no lugar do formulário de pausa

**Desenhado, não implementado.** Quando `pauseForm` está activo, a intenção é substituir o
formulário por um CTA para WhatsApp com número dedicado, em vez de mostrar só uma frase a
dizer que está pausado.

O desenho está fechado; não há código. Enquanto não se implementar, o que o site mostra é
o aviso de pausa normal.

### Migração para Cloudflare Pages

**Analisado, não decidido.** Ver [secção 8](#8-vercel-hobby-e-uso-comercial) — é a
alternativa gratuita ao Vercel Pro, ao custo de adaptar o backend Express.

---

## O que deliberadamente não está aqui

- **Procedimentos, comandos e checklists** → [GUIA-DEPLOY.md](../GUIA-DEPLOY.md)
- **Envio de email e leitura de logs** → [docs/email.md](email.md)
- **`api/index.js` estar committed, push ser o deploy, `MSYS_NO_PATHCONV`** → são factos
  operacionais já documentados no GUIA; repeti-los aqui só cria dois sítios para manter.
