# Rifa Carrozza — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o sistema de rifa do `spec.md` em Next.js + shadcn/ui, com o visual escuro aprovado, edição de conteúdo/PIX no admin e deploy manual no Cloudflare Workers.

**Architecture:** Lógica de domínio em funções puras (`lib/dominio/`) que mutam um `Estado`. Uma camada de armazenamento lê/grava `rifa.json` via GitHub Contents API com CAS por `sha` (`lib/github.ts`, `lib/db.ts`). Route Handlers finos chamam `atualizar()`/`lerEstado()`. As páginas são Server Components que leem o estado direto e passam dados a Client Components. O deploy é feito com `@opennextjs/cloudflare`.

**Tech Stack:** Next.js (App Router, versão estável mais recente suportada pelo `@opennextjs/cloudflare`), TypeScript, Tailwind v4, shadcn/ui, Vitest, `@opennextjs/cloudflare` + wrangler, tsx (seed).

**Spec:** `spec.md` (regras, API, telas e critérios de aceite) + `docs/superpowers/specs/2026-10-27-rifa-carrozza-design.md` (o que muda ou se acrescenta; prevalece em conflito). Leia os dois antes de cada tarefa.

## Global Constraints

- Todo Route Handler: `export const runtime = "nodejs"` e `export const dynamic = "force-dynamic"`. Nunca `"edge"`.
- Next 15+: `params` de rotas dinâmicas é `Promise` → `const { id } = await params`.
- Nenhuma resposta pública (`/api/rifa`, `/api/reservas*`, HTML de `/`) contém `nome` ou `telefone` de reserva.
- Datas gravadas em UTC ISO (`toISOString()`); exibidas com `Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" })`.
- `TOLERANCIA_MS = 30_000`. Id de reserva `"r_" + 10 chars [a-z0-9]`, gerado fora da mutação.
- Commit no repo de dados: `[rifa] <acao> <idReserva> <numeros separados por vírgula>`; config: `[rifa] config_editada`; seed: `[rifa] inicialização`.
- Formato de erro: `{ "erro": { "codigo", "mensagem", "numeros"? } }`, com os códigos/HTTP da tabela do spec §7, mais `RIFA_NAO_INICIALIZADA` (503) e `INTERNO` (500).
- Tema escuro fixo (sem alternância). Paleta: fundo `#0b0b0c`, superfície `#141416`, borda `#27272a`, texto `#f4f4f5`, texto secundário `#a1a1aa`, primário `#f5b301` com texto `#111111`. Grade: livre `#1c1c1f`/borda `#2e2e33`/texto `#e4e4e7`; selecionado `#f5b301`/texto `#111`; reservado `#3f3f46`/texto `#71717a`; pendente `#52410f`/texto `#c9a227`; confirmado `#18181b`/texto `#3f3f46` riscado.
- Fontes: Inter (texto) e Space Grotesk (títulos) via `next/font/google`.
- UI em português do Brasil. Textos de UI do spec §8 (incl. tabela de descrição de eventos) copiados literalmente.
- Valor padrão: `valorPorNumeroCentavos: 80000` (R$ 800,00).
- **Nunca** rodar `git push`/`git pull` (chave SSH do usuário tem senha). Commits locais apenas.

## Review Focus

1. **`rifa:reservaAtiva` corrompida ou de formato antigo no `localStorage`** → a página carrega normalmente e descarta a chave, sem tela branca. Teste em Task 9 (`lerReservaAtiva`).
2. **URL do Instagram com variações** (`/reel/`, sem barra final, `?igsh=…`, `instagram.com` sem `www`) → o embed funciona. Já uma URL inválida faz o admin receber `DADOS_INVALIDOS` e o público não mostrar a seção. Testes em Task 5 (`editarConfig`) e Task 9 (`shortcodeInstagram`).
3. **`rifa.json` ainda não criado** (seed não rodou) → as APIs respondem 503 `RIFA_NAO_INICIALIZADA` e a página mostra "Rifa ainda não inicializada", sem 500 genérico. Teste em Task 6 (`lerArquivo` com 404).
4. **Nomes com acento/emoji** ("João Conceição 🎸") → o texto sobrevive à ida e volta em base64 UTF-8 até o GitHub. Teste em Task 6 (`codificar`/`decodificar`).
5. **Número selecionado que outra pessoa reserva antes do clique** (o polling atualiza a grade) → ele sai da seleção sozinho, e a barra recalcula o total. Teste em Task 9 (`podarSelecao`).

---

## Estrutura de arquivos

```
app/
  layout.tsx, globals.css                     # tema, fontes, Toaster
  page.tsx                                    # Server: lê estado, monta seções
  api/rifa/route.ts                           # GET
  api/reservas/route.ts                       # POST
  api/reservas/[id]/route.ts                  # GET, DELETE
  api/reservas/[id]/confirmar/route.ts        # POST
  api/admin/login/route.ts, logout/route.ts   # POST
  api/admin/estado/route.ts                   # GET
  api/admin/config/route.ts                   # PATCH (novo)
  api/admin/reservas/[id]/route.ts            # PATCH
  api/admin/reservas/[id]/[acao]/route.ts     # POST confirmar|desconfirmar|remover
  admin/login/page.tsx                        # fora do guard
  admin/(protegido)/layout.tsx                # estaLogado() → redirect("/admin/login")
  admin/(protegido)/page.tsx
  admin/(protegido)/reservas/[id]/page.tsx
  admin/(protegido)/configuracoes/page.tsx    # novo
components/
  ui/*                                        # shadcn
  GradeNumeros.tsx, TimerReserva.tsx, FormConfirmacao.tsx
  publico/{Hero,Historia,VideoInstagram,ComoFunciona,SecaoReserva,BarraSelecao,TelaSucesso}.tsx
  admin/{Resumo,CardPendente,GradeAdmin,HistoricoNumeroDialog,HistoricoGeral,AcoesNumero,FormPerfil,FormConfig,BotaoSair}.tsx
lib/
  erros.ts, formatar.ts, instagram.ts, http.ts
  github.ts, armazenamento.ts, db.ts, auth.ts
  cliente/{api,reserva-ativa,selecao}.ts
  dominio/{tipos,validacao,estado-inicial,expiracao,reservas,admin,config,historico,publico}.ts
test/fixtures.ts
scripts/seed.ts
public/img/{hero-guitarra.jpg,logo-carrozza-branca.png}
wrangler.jsonc, open-next.config.ts, vitest.config.ts, .dev.vars.example, .env.example, README.md
```

*Desvio do spec §11:* o guard do admin fica em `app/admin/(protegido)/layout.tsx`, um route group, para que `/admin/login` não seja redirecionado para si mesmo. As URLs são as mesmas.

*Desvio do design (escolha do plano):* `lib/armazenamento.ts` usa um armazenamento **em memória** quando `GITHUB_TOKEN` não está definido e `NODE_ENV !== "production"`. Isso permite rodar `npm run dev` e verificar a UI sem credenciais. Em produção sem token, ele lança erro.

---

### Task 1: Scaffold, tema, Cloudflare e repositório

**Files:**
- Create: projeto Next.js na raiz, `components.json`, `components/ui/*`, `app/globals.css`, `app/layout.tsx`, `wrangler.jsonc`, `open-next.config.ts`, `vitest.config.ts`, `.dev.vars.example`, `.env.example`, `public/img/*`
- Modify: `.gitignore`, `package.json`, `next.config.ts`

**Interfaces:**
- Produces: alias `@/*` → raiz; classes Tailwind `bg-livre`, `bg-selecionado`, `bg-reservado`, `bg-pendente`, `bg-confirmado` (+ `text-*`/`border-*` correspondentes) e `font-display`; scripts `dev`, `build`, `preview`, `deploy`, `test`, `seed`.

- [ ] **Step 1: Inicializar git.** `git init -b main` e `git remote add origin git@github.com:droderuan/rifa_carrozza.git`.
- [ ] **Step 2: Gerar o Next.js.** Como a raiz não está vazia, gere num diretório temporário e copie para cá: `npx create-next-app@latest <tmp>/app --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --yes`. Depois, `rsync -a --exclude .git --exclude node_modules <tmp>/app/ ./` e `npm install`.
- [ ] **Step 3: Adaptador Cloudflare.** Siga a doc atual do OpenNext para "app Next.js existente". Use `npx @opennextjs/cloudflare migrate` se existir; senão, instale `@opennextjs/cloudflare` + `wrangler` (dev) e crie `wrangler.jsonc` (`name: "rifa-carrozza"`, `compatibility_flags: ["nodejs_compat"]`, data de compatibilidade recente, `vars: { GITHUB_OWNER: "droderuan", GITHUB_REPO: "rifa_carrozza", GITHUB_BRANCH: "main", GITHUB_DB_PATH: "rifa.json" }`) e `open-next.config.ts`. Os scripts ficam `preview: "opennextjs-cloudflare build && opennextjs-cloudflare preview"` e `deploy: "opennextjs-cloudflare build && opennextjs-cloudflare deploy"`. Em `next.config.ts`, defina `images: { unoptimized: true }`.
- [ ] **Step 4: shadcn.** Rode `npx shadcn@latest init` (base neutral/zinc) e depois `npx shadcn@latest add button card badge progress input textarea label sheet dialog alert-dialog table tabs select tooltip popover sonner separator skeleton`.
- [ ] **Step 5: Tema.** Em `globals.css`, coloque a paleta das Global Constraints nas variáveis shadcn (`--background`, `--foreground`, `--card`, `--popover`, `--muted`, `--muted-foreground`, `--border`, `--input`, `--primary`, `--primary-foreground`, `--ring`) dentro de `:root`, já que o tema é só escuro. No `@theme inline`, adicione `--color-livre`, `--color-livre-borda`, `--color-selecionado`, `--color-reservado`, `--color-pendente`, `--color-confirmado` (e as variantes `-texto`) e `--font-display`. Em `layout.tsx`: `<html lang="pt-BR" className="dark">`, Inter em `--font-sans`, Space Grotesk em `--font-display`, `<Toaster />` do sonner e metadata com `title: "Juntos pela Carrozza"`.
- [ ] **Step 6: Imagens.** Baixe a guitarra em `https://static.wixstatic.com/media/2eaac7_a86e550caec045248e821f1f0c124270~mv2.jpg/v1/fill/w_1400,h_1400,q_80/hero.jpg` para `public/img/hero-guitarra.jpg` e a logo em `https://static.wixstatic.com/media/a47240_2045e3195de24171a4040524e1b4ec61~mv2.png` para `public/img/logo-carrozza-branca.png`. Confira com `file public/img/*` que são JPEG e PNG.
- [ ] **Step 7: Vitest e tsx.** Instale `npm i -D vitest vite-tsconfig-paths tsx`. Crie `vitest.config.ts` com `environment: "node"`, plugin `tsconfigPaths()` e `include: ["lib/**/*.test.ts"]`. Scripts: `test: "vitest run"` e `seed: "tsx --env-file=.env.local scripts/seed.ts"`.
- [ ] **Step 8: Arquivos de ambiente.** O `.gitignore` deve incluir `node_modules`, `.next`, `.open-next`, `.wrangler`, `.env*` (com exceção `!.env.example`), `.dev.vars` e `.superpowers/`. Crie `.env.example` e `.dev.vars.example` com as 7 variáveis do spec §3.1 vazias (e os valores padrão de owner/repo).
- [ ] **Step 9: Verificar.** `npm run build` deve terminar com sucesso e `npx vitest run --passWithNoTests` deve sair com 0.
- [ ] **Step 10: Commit.** `git add -A`, com o `spec.md` e `docs/` incluídos. Mensagem: `chore: scaffold Next.js + shadcn + OpenNext Cloudflare`.

---

### Task 2: Tipos, erros, formatação e validação

**Files:**
- Create: `lib/dominio/tipos.ts`, `lib/erros.ts`, `lib/formatar.ts`, `lib/dominio/validacao.ts`, `lib/dominio/estado-inicial.ts`, `test/fixtures.ts`
- Test: `lib/formatar.test.ts`, `lib/dominio/validacao.test.ts`

**Interfaces:**
- Produces:
  - `tipos.ts`: tipos do spec §4.1, com `Config` estendida conforme design §4.3 (`subtitulo?`, `historia?`, `instagramUrl?`, `pix?: { chave; titular; banco }`).
  - `erros.ts`: `type CodigoErro` (códigos do spec §7 + `"RIFA_NAO_INICIALIZADA" | "INTERNO"`); `class ErroDominio extends Error { constructor(codigo: CodigoErro, status: number, mensagem: string, numeros?: string[]) }`; `respostaErro(e: unknown): Response`, que transforma `ErroDominio` no JSON padrão com o status dele e qualquer outro erro em 500 `INTERNO` (com `console.error`).
  - `formatar.ts`: `formatarNumero(n: string): string`, `formatarMoeda(centavos: number): string` (espaço normal, sem NBSP), `formatarTelefone(digitos: string): string`, `mascaraTelefone(entrada: string): string`, `linkWhatsApp(digitos: string): string`, `formatarDataHora(iso: string): string`, `minutosDesde(iso: string, agora: Date): number`.
  - `validacao.ts`: `normalizarNome(v: unknown): string` e `normalizarTelefone(v: unknown): string`, que lançam `ErroDominio("DADOS_INVALIDOS", 400, …)`.
  - `estado-inicial.ts`: `CONFIG_PADRAO: Config` (valores exatos do design §4.3) e `criarEstadoInicial(config?: Config): Estado`.
  - `test/fixtures.ts`: `T0 = new Date("2026-10-28T00:05:00.000Z")`, `depois(base: Date, ms: number): Date` e `estadoNovo(parcial?: Partial<Config>): Estado`.

- [ ] **Step 1: Testes que falham.** Em `formatar.test.ts`, os casos são:
  - `formatarNumero("7") === "07"` e `formatarNumero("100") === "100"`
  - `formatarMoeda(80000) === "R$ 800,00"` e `formatarMoeda(8000000) === "R$ 80.000,00"`
  - `formatarTelefone("21999998888") === "(21) 99999-8888"` e `formatarTelefone("1436221234") === "(14) 3622-1234"`
  - `mascaraTelefone("2199999") === "(21) 9999-9"` e `mascaraTelefone("21999998888123") === "(21) 99999-8888"`
  - `linkWhatsApp("21999998888") === "https://wa.me/5521999998888"`
  - `formatarDataHora("2026-10-28T00:05:00.000Z")` contém `"27/10/2026"` e `"21:05"`
  - `minutosDesde("2026-10-28T00:05:00.000Z", depois(T0, 7*60000+59000)) === 7`

  Em `validacao.test.ts`, os casos são:
  - `normalizarNome("  Maria   Souza ") === "Maria Souza"`
  - `"A"` e uma string de 81 caracteres lançam `DADOS_INVALIDOS`; 80 caracteres é aceito
  - `normalizarTelefone` vira `"21999998888"` a partir de `"(21) 99999-8888"`, `"+55 21 99999-8888"` e `"5521999998888"`
  - `"551436221234"` vira `"1436221234"`
  - `"10999998888"` (DDD < 11), `"999998888"` (9 dígitos) e `123` (não string) lançam erro
- [ ] **Step 2: Rodar.** `npx vitest run lib/formatar.test.ts lib/dominio/validacao.test.ts` deve FALHAR, porque os módulos ainda não existem.
- [ ] **Step 3: Implementar** os módulos com as assinaturas acima. `criarEstadoInicial` gera `numeros["1".."100"]` todos `{ status: "livre", reserva: null }`, e `reservas` e `eventos` vazios.
- [ ] **Step 4: Rodar.** O mesmo comando deve PASSAR.
- [ ] **Step 5: Commit.** `feat: tipos, erros, formatação e validação`

---

### Task 3: Expiração e fluxo do comprador

**Files:**
- Create: `lib/dominio/expiracao.ts`, `lib/dominio/reservas.ts`, `lib/dominio/publico.ts`
- Test: `lib/dominio/expiracao.test.ts`, `lib/dominio/reservas.test.ts`, `lib/dominio/publico.test.ts`

**Interfaces:**
- Consumes: Task 2.
- Produces:
  - `expiracao.ts`: `TOLERANCIA_MS`, `estaEfetivamenteExpirada(r: Reserva, agora: Date): boolean`, `aplicarExpiracoes(estado: Estado, agora: Date): void`.
  - `reservas.ts`:
    - `gerarIdReserva(existentes: Record<string, Reserva>): string`
    - `numerosDaReserva(estado: Estado, id: string): string[]` (ordem numérica)
    - `segundosRestantes(r: Reserva, agora: Date): number`
    - `reservar(estado, agora, id: string, numeros: unknown): void`
    - `confirmarReserva(estado, agora, id: string, dados: { nome: unknown; telefone: unknown }): void`
    - `cancelarReserva(estado, agora, id: string): void`
    - `obterReserva(estado, id): Reserva` (lança `RESERVA_NAO_ENCONTRADA` 404)
  - `publico.ts`: `visaoPublica(estado: Estado): { config: Config; numeros: { numero: string; status: StatusNumero }[] }`, com os números em ordem numérica.

- [ ] **Step 1: Testes que falham** (todos usam `estadoNovo()` e `T0`):

  `reservar`:
  - `reservar(e, T0, "r_aaaaaaaaaa", ["7","12"])` deixa os dois números `reservado` apontando para a reserva. A reserva fica `aberta`, com `expiraEm = T0 + 10min`, `nome` `null`, `solicitadaEm` `null`. O último evento é `{ acao: "reservado", por: "comprador", numeros: ["7","12"], em: T0.toISOString() }`, sem `nome`.
  - `["7","7"]`, `[]`, `"7"`, `["0"]` e `["101"]` lançam `DADOS_INVALIDOS`.
  - Com `maxPorReserva: 2`, `["1","2","3"]` lança `LIMITE_EXCEDIDO`.
  - Se o 12 já estiver ocupado, `["7","12"]` lança `NUMEROS_INDISPONIVEIS` com `numeros: ["12"]`, e o 7 continua `livre` (critério 3).
  - Um número de uma reserva vencida (passou de `expiraEm + 30s`) pode ser reservado depois de `aplicarExpiracoes`.

  `confirmarReserva`:
  - Em `T0 + 9min`, com nome `" Maria  Souza"` e telefone `"(21) 99999-8888"`, os números vão a `pendente`, a reserva vai a `solicitada` com nome e telefone normalizados e `solicitadaEm` preenchido. O evento é `solicitado`, com o snapshot de nome e telefone (critério 7).
  - Em `expiraEm + 29s` passa; em `expiraEm + 31s` lança `RESERVA_EXPIRADA` 410 (critério 5).
  - Uma reserva já `solicitada` lança `RESERVA_NAO_ABERTA`; um id inexistente lança `RESERVA_NAO_ENCONTRADA`.

  `cancelarReserva`:
  - Uma reserva aberta libera os números, vira `cancelada` e gera o evento `cancelado`.
  - Uma reserva `solicitada` lança `RESERVA_NAO_ABERTA` 409 (critério 8).

  `aplicarExpiracoes`:
  - Em `expiraEm + 31s`: a reserva vira `expirada`, os números voltam a `livre` e entra um evento `{ acao: "expirado", por: "sistema", em: expiraEm }`.
  - Em `expiraEm + 29s` nada muda.
  - Rodar duas vezes não duplica o evento.

  `segundosRestantes`:
  - `T0 + 1s` dá `599`; depois do prazo dá `0`; uma reserva não aberta dá `0`.

  `gerarIdReserva`:
  - Casa com `/^r_[a-z0-9]{10}$/` e não colide com uma chave existente.

  `visaoPublica`:
  - Depois de reservar e confirmar com o nome "Maria", `JSON.stringify(visaoPublica(e))` não contém `"Maria"` nem `"21999998888"`, e retorna 100 números (critério 1).
- [ ] **Step 2: Rodar.** `npx vitest run lib/dominio` deve FALHAR.
- [ ] **Step 3: Implementar.** As funções validam tudo antes de mutar, para que um erro não deixe o estado pela metade. `gerarIdReserva` usa `crypto.getRandomValues`.
- [ ] **Step 4: Rodar.** `npx vitest run lib/dominio` deve PASSAR.
- [ ] **Step 5: Commit.** `feat: domínio de reservas e expiração`

---

### Task 4: Ações do admin e histórico

**Files:**
- Create: `lib/dominio/admin.ts`, `lib/dominio/historico.ts`
- Test: `lib/dominio/admin.test.ts`, `lib/dominio/historico.test.ts`

**Interfaces:**
- Consumes: Tasks 2–3.
- Produces:
  - `admin.ts`:
    - `confirmarNumeros(estado, agora, id, numeros?: unknown): void`
    - `desconfirmarNumeros(...)` e `removerNumeros(...)`, com a mesma assinatura
    - `editarPerfil(estado, agora, id, dados: { nome?: unknown; telefone?: unknown }): boolean` (retorna `false` se nada mudou)
    - `type AcaoAdmin = "confirmar" | "desconfirmar" | "remover"`
    - `ACOES_ADMIN: Record<AcaoAdmin, typeof confirmarNumeros>`
  - `historico.ts`:
    - `descreverEvento(e: Evento): string`
    - `ordenarPorData(ev: Evento[]): Evento[]` (estável)
    - `eventosDoNumero(ev, n: string): Evento[]` (cronológica)
    - `eventosDaReserva(ev, id): Evento[]` (cronológica)
    - `filtrarPorAcao(ev, acao: AcaoEvento | "todas"): Evento[]`

- [ ] **Step 1: Testes que falham.**

  Cada transição do spec §5.1 tem um caso de sucesso e um caso de status de origem errado, que lança `TRANSICAO_INVALIDA` 409:
  - confirmar `pendente→confirmado`
  - desconfirmar `confirmado→pendente`
  - remover `pendente|confirmado→livre` (com `reserva: null`, e a reserva continua `solicitada` mesmo ficando sem números)

  Casos de `numeros` explícito e omitido:
  - Com `numeros` explícito incluindo um número de outra reserva, a ação inteira falha e nada muda.
  - Sem `numeros`, a ação vale para todos os números no status de origem; se não houver nenhum, lança `TRANSICAO_INVALIDA`.
  - Os eventos de admin têm `por: "admin"` e o snapshot de nome e telefone.

  `editarPerfil`:
  - Mudar só o nome gera o evento `perfil_editado` com `numeros: []`, `de: { nome: "A" }` e `para: { nome: "B" }`, e retorna `true`.
  - Enviar os mesmos valores retorna `false`, sem evento.
  - Uma reserva `aberta` lança `TRANSICAO_INVALIDA`.

  `descreverEvento` cobre os 8 textos literais da tabela do spec §8.3:
  - `reservado` → `"Reservado (reserva r_x)"`
  - `perfil_editado` com dois campos junta as partes com `"; "`, por exemplo `Perfil corrigido: nome "A" → "B"; telefone "(21) 99999-8888" → "(21) 98888-7777"`, com o telefone formatado.

  Critério 11, que é o teste principal:
  - Monte em sequência A reserva o 7, A confirma, admin remove, B reserva o 7, B confirma, admin confirma, admin desconfirma, admin remove. Use tempos crescentes.
  - `eventosDoNumero(e.eventos, "7").map(x => x.acao)` deve ser `["reservado","solicitado","removido","reservado","solicitado","confirmado","desconfirmado","removido"]`.
  - O nome nos eventos 2–3 é A e nos eventos 5–8 é B. O 7 termina `livre`.

  Critério 10: depois de editar o perfil de A para A2, os eventos anteriores continuam com `nome: "A"` e uma ação posterior registra `"A2"`.
- [ ] **Step 2: Rodar.** `npx vitest run lib/dominio/admin.test.ts lib/dominio/historico.test.ts` deve FALHAR.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar.** `npx vitest run lib/dominio` deve PASSAR.
- [ ] **Step 5: Commit.** `feat: ações do admin e histórico`

---

### Task 5: Edição de config

**Files:**
- Create: `lib/dominio/config.ts`, `lib/instagram.ts`
- Test: `lib/dominio/config.test.ts`, `lib/instagram.test.ts`

**Interfaces:**
- Produces:
  - `instagram.ts`: `shortcodeInstagram(url: string | undefined): string | null` e `REGEX_INSTAGRAM`
  - `config.ts`: `type DadosConfig = Partial<Pick<Config, "titulo"|"subtitulo"|"historia"|"instagramUrl"|"instrucoesPagamento">> & { pix?: Partial<NonNullable<Config["pix"]>> }` e `editarConfig(estado: Estado, dados: unknown): boolean`

- [ ] **Step 1: Testes que falham.**

  `shortcodeInstagram`:
  - Retorna `"De-Mr-gBsLA"` para:
    - `https://www.instagram.com/p/De-Mr-gBsLA/`
    - `https://instagram.com/p/De-Mr-gBsLA`
    - `https://www.instagram.com/reel/De-Mr-gBsLA/?igsh=abc`
  - Retorna `null` para `https://youtube.com/x`, `""` e `undefined`.

  `editarConfig`:
  - `{ historia: "  Novo texto  " }` grava `"Novo texto"` e retorna `true`; repetir o mesmo valor retorna `false`.
  - `{ pix: { chave: "123" } }` mescla com o pix existente, sem perder titular e banco.
  - `{ pix: { banco: "" } }` lança `DADOS_INVALIDOS`.
  - `{ titulo: "A" }` e uma `historia` com 4001 caracteres lançam erro.
  - `{ instagramUrl: "https://youtube.com/x" }` lança erro; `{ instagramUrl: "" }` remove o campo.
  - `{ valorPorNumeroCentavos: 1 }` lança `DADOS_INVALIDOS` (campo não editável) e não altera o valor.
  - `editarConfig` não adiciona nada em `eventos`.
- [ ] **Step 2: Rodar.** `npx vitest run lib/dominio/config.test.ts lib/instagram.test.ts` deve FALHAR.
- [ ] **Step 3: Implementar.** Use os limites do design §6.1.
- [ ] **Step 4: Rodar.** O mesmo comando deve PASSAR.
- [ ] **Step 5: Commit.** `feat: edição de config pelo admin (domínio)`

---

### Task 6: Armazenamento (GitHub, memória, CAS, cache) e seed

**Files:**
- Create: `lib/github.ts`, `lib/armazenamento.ts`, `lib/db.ts`, `scripts/seed.ts`
- Test: `lib/github.test.ts`, `lib/db.test.ts`

**Interfaces:**
- Consumes: Tasks 2–3.
- Produces:
  - `github.ts`:
    - `codificar(estado: Estado): string` e `decodificar(base64: string): Estado`
    - `lerArquivo(): Promise<{ estado; sha }>`
    - `gravarArquivo(estado, sha: string | null, mensagem): Promise<"ok"|"conflito">`
    - `arquivoExiste(): Promise<boolean>`
    - Segue o spec §6.1 com o header `User-Agent: "rifa-carrozza"`. No GET, 404 lança `ErroDominio("RIFA_NAO_INICIALIZADA", 503, "Rifa ainda não inicializada.")`. No PUT, 409 **e** 422 com "sha" no corpo retornam `"conflito"`.
  - `armazenamento.ts`:
    - `interface Armazenamento { ler(): Promise<{ estado: Estado; sha: string }>; gravar(estado: Estado, sha: string | null, mensagem: string): Promise<"ok"|"conflito"> }`
    - `criarArmazenamentoMemoria(inicial?: Estado): Armazenamento & { commits: string[] }`, com o sha como contador; sha diferente do atual dá `"conflito"`; usa `structuredClone` na entrada e na saída.
    - `obterArmazenamento(): Armazenamento`: GitHub se `GITHUB_TOKEN` existir; memória (singleton em `globalThis`) se `NODE_ENV !== "production"`; senão lança erro.
    - `definirArmazenamento(a: Armazenamento | null): void`, para testes.
  - `db.ts`:
    - `lerEstado(opts?: { fresco?: boolean }): Promise<Estado>` (visão clonada com expirações; cache de 5 s quando não fresco)
    - `atualizar(mensagem: string | ((novos: Evento[]) => string), mutacao: (estado: Estado, agora: Date) => void | boolean): Promise<Estado>`. Se a mutação retornar `false`, ele não grava; `novos` são os eventos adicionados **pela mutação**, sem contar os de expiração.
    - `mensagemCommit(novos: Evento[]): string`, que usa o último evento, junta os números com vírgula e faz trim.
    - `invalidarCache(): void`

- [ ] **Step 1: Testes que falham.**

  `github.test.ts` (com `vi.stubGlobal("fetch", …)`):
  - `decodificar(codificar(e))` preserva o nome `"João Conceição 🎸"`.
  - Um GET 404 rejeita com o código `RIFA_NAO_INICIALIZADA`.
  - Um PUT 409 retorna `"conflito"`.
  - O GET envia `Authorization: Bearer …`, `User-Agent` e `?ref=main`.

  `db.test.ts` (com `definirArmazenamento(criarArmazenamentoMemoria(estadoNovo()))`):
  - Commits:
    - Um `atualizar(mensagemCommit, (e,a)=>reservar(e,a,"r_aaaaaaaaaa",["7","12"]))` gera exatamente um commit `"[rifa] reservado r_aaaaaaaaaa 7,12"` (critério 12).
    - Uma mutação que retorna `false` não gera commit.
    - Uma mutação que lança `ErroDominio` propaga o erro sem retentar nem commitar.
  - Conflitos:
    - Um armazenamento cujo `gravar` retorna `"conflito"` uma vez e depois `"ok"` termina em sucesso, com `ler` chamado 2 vezes.
    - Se `gravar` retorna `"conflito"` sempre, lança `CONFLITO_PERSISTENTE` 503 depois de 5 tentativas. Use `vi.useFakeTimers()` ou injete a espera.
  - Critério 2: `Promise.allSettled` com duas reservas de `["7"]` (ids diferentes) dá exatamente 1 sucesso e 1 rejeição com `NUMEROS_INDISPONIVEIS` e `numeros: ["7"]`. O estado final tem o 7 numa reserva só.
  - Critério 6:
    - Com a reserva vencida, `lerEstado({fresco:true})` mostra o número `livre` e não gera commit.
    - A próxima escrita gera um único commit, e o estado gravado contém o evento `expirado` com a reserva `expirada`.
  - Cache:
    - Duas chamadas `lerEstado()` em menos de 5 s fazem 1 leitura.
    - Depois de `invalidarCache()` são 2 leituras.
    - `fresco: true` sempre lê.
- [ ] **Step 2: Rodar.** `npx vitest run lib/github.test.ts lib/db.test.ts` deve FALHAR.
- [ ] **Step 3: Implementar.** Use `lib/github.ts` (spec §6.1), `lib/armazenamento.ts` e `lib/db.ts` (spec §6.2 e §6.3). Para a espera entre tentativas, use `150 * tentativa + Math.random() * 150` ms.
- [ ] **Step 4: Implementar `scripts/seed.ts`.** Exija as variáveis `GITHUB_*`. Se `arquivoExiste()` for verdadeiro, imprima "rifa.json já existe — nada a fazer" e saia com código 1. Caso contrário, rode `gravarArquivo(criarEstadoInicial(), null, "[rifa] inicialização")` e imprima a URL do arquivo.
- [ ] **Step 5: Rodar.** `npx vitest run` deve PASSAR, com todas as suítes até aqui.
- [ ] **Step 6: Commit.** `feat: armazenamento GitHub com CAS, cache e seed`

---

### Task 7: Autenticação do admin

**Files:**
- Create: `lib/auth.ts`
- Test: `lib/auth.test.ts`

**Interfaces:**
- Produces:
  - `COOKIE_SESSAO = "admin_session"` e `VALIDADE_SESSAO_S = 604800`
  - `criarValorSessao(agoraMs: number, segredo: string): Promise<string>`, que retorna `"${expUnix}.${hmacHex}"`
  - `validarValorSessao(valor: string | undefined, agoraMs: number, segredo: string): Promise<boolean>`
  - `senhaConfere(informada: string, correta: string): Promise<boolean>`, que compara o HMAC das duas em tempo constante
  - `opcoesCookie(): { httpOnly: true; secure: boolean; sameSite: "lax"; path: "/"; maxAge: number }`, com `secure = process.env.NODE_ENV === "production"`
  - `estaLogado(): Promise<boolean>` e `exigirAdmin(): Promise<void>`, que leem `cookies()` de `next/headers`; `exigirAdmin` lança `NAO_AUTORIZADO` 401

- [ ] **Step 1: Testes que falham** (só as funções puras):
  - Um valor criado agora valida.
  - O mesmo valor com `agoraMs` 7 dias + 1 s depois não valida.
  - Trocar 1 caractere da assinatura não valida.
  - Trocar o `exp` para mais tarde não valida.
  - `undefined`, `""` e `"abc"` não validam.
  - Outro segredo não valida.
  - `senhaConfere("x","x")` dá `true`; `("x","y")` e `("", "y")` dão `false`.
- [ ] **Step 2: Rodar.** `npx vitest run lib/auth.test.ts` deve FALHAR.
- [ ] **Step 3: Implementar** com `crypto.subtle` (HMAC SHA-256).
- [ ] **Step 4: Rodar.** O mesmo comando deve PASSAR.
- [ ] **Step 5: Commit.** `feat: sessão do admin com HMAC`

---

### Task 8: Route Handlers

**Files:**
- Create: `lib/http.ts` e todas as rotas `app/api/**` da estrutura de arquivos
- Test: `lib/http.test.ts`

**Interfaces:**
- Consumes: Tasks 2–7.
- Produces:
  - `http.ts`: `lerCorpo(req: Request): Promise<Record<string, unknown>>`, que lança `DADOS_INVALIDOS` para JSON inválido ou corpo que não seja objeto; `rota(handler: (req: Request, ctx: any) => Promise<Response>)`, que envolve o handler com `try/catch → respostaErro`.
  - O contrato das respostas está no spec §7. Ações de admin retornam `{ reserva: Reserva, numeros: { numero, status }[] }`. `GET /api/admin/estado` retorna `Estado`. `PATCH /api/admin/config` retorna `{ config }`.

- [ ] **Step 1: Teste que falha.** `lerCorpo` com `"{"`, `"[]"` e `"null"` lança `DADOS_INVALIDOS`; com `'{"a":1}'` retorna `{a:1}`. Um `rota` que lança `ErroDominio("NUMEROS_INDISPONIVEIS",409,"m",["7"])` responde 409 com o corpo `{erro:{codigo:"NUMEROS_INDISPONIVEIS",mensagem:"m",numeros:["7"]}}`; um `Error` comum responde 500 `INTERNO`.
- [ ] **Step 2: Rodar.** `npx vitest run lib/http.test.ts` deve FALHAR.
- [ ] **Step 3: Implementar `lib/http.ts`** e rodar de novo; deve PASSAR.
- [ ] **Step 4: Implementar as rotas.**
  - `POST /api/reservas`: gera o id com `gerarIdReserva(estadoAtual.reservas)` **antes** de `atualizar`. Se o id colidir dentro da mutação, a mutação lança e a rota tenta de novo com outro id (no máximo 3 vezes). Retorna 201.
  - `GET /api/reservas/[id]`: usa `lerEstado({fresco:true})`.
  - `GET /api/rifa`: retorna `visaoPublica(await lerEstado())`.
  - Rotas admin: chamam `exigirAdmin()` primeiro, exceto o login.
  - Login: usa `senhaConfere` e responde 401 `NAO_AUTORIZADO` com a mensagem "Senha incorreta". Em caso de sucesso, `cookies().set(COOKIE_SESSAO, …, opcoesCookie())`.
  - Logout: apaga o cookie.
  - `[acao]`: valida contra `ACOES_ADMIN` e responde 404 se a ação não existir.
  - `PATCH` de perfil e de config: usam `editarPerfil` e `editarConfig` dentro de `atualizar`; mensagem `mensagemCommit` e `"[rifa] config_editada"`, respectivamente.
- [ ] **Step 5: Verificar com a API em memória.** Rode `npm run dev` sem `GITHUB_TOKEN`, com `ADMIN_PASSWORD=teste` e `ADMIN_SESSION_SECRET=x` em `.env.local`. Com `curl`, confira:
  - `GET /api/rifa` → 200 com 100 números, sem nome nem telefone
  - `POST /api/reservas {"numeros":["7"]}` → 201
  - repetir o mesmo POST → 409 `NUMEROS_INDISPONIVEIS`
  - `POST /api/reservas/<id>/confirmar` → 200
  - `GET /api/admin/estado` sem cookie → 401
  - login → cookie `admin_session`
  - `GET /api/admin/estado` com o cookie → 200 e o nome presente
  - `POST /api/admin/reservas/<id>/confirmar` → 200
  - `PATCH /api/admin/config {"historia":"x"}` → 200
- [ ] **Step 6: Commit.** `feat: rotas da API`

---

### Task 9: Página pública

**Files:**
- Create: `lib/cliente/api.ts`, `lib/cliente/reserva-ativa.ts`, `lib/cliente/selecao.ts`, `components/GradeNumeros.tsx`, `components/TimerReserva.tsx`, `components/FormConfirmacao.tsx`, `components/publico/*`
- Modify: `app/page.tsx`
- Test: `lib/cliente/reserva-ativa.test.ts`, `lib/cliente/selecao.test.ts`

**Interfaces:**
- Consumes: `visaoPublica`, `lerEstado`, `formatar.ts`, `shortcodeInstagram`, as rotas da Task 8.
- Produces:
  - `reserva-ativa.ts`:
    - `CHAVE_RESERVA = "rifa:reservaAtiva"`
    - `type ReservaAtiva = { id: string; numeros: string[]; prazo: number }`
    - `lerReservaAtiva(s: Pick<Storage,"getItem"|"removeItem">): ReservaAtiva | null`, que remove a chave e retorna `null` se a validação falhar
    - `salvarReservaAtiva(s, r)` e `limparReservaAtiva(s)`
  - `selecao.ts`: `podarSelecao(selecao: string[], numeros: { numero: string; status: StatusNumero }[]): { mantidos: string[]; removidos: string[] }`
  - `api.ts`: `class ErroApi extends Error { codigo; numeros? }` e `obterRifa`, `criarReserva`, `obterReserva`, `confirmar`, `cancelar`. Respostas fora de 2xx lançam `ErroApi`.
  - `GradeNumeros` props: `{ numeros: {numero,status}[]; selecionados?: Set<string>; somenteLeitura?: boolean; onClicar?: (n: string) => void; renderDica?: (n: string) => React.ReactNode }`, reutilizado pelo admin.

- [ ] **Step 1: Testes que falham.**

  `lerReservaAtiva`:
  - Retorna `null` e remove a chave para `"{"`, `'{"id":1}'`, `'{"id":"r_x","numeros":"7","prazo":1}'` e `null`.
  - Retorna o objeto para um JSON válido.

  `podarSelecao`:
  - Com `["7","12"]` e o 12 `reservado`, retorna `{ mantidos: ["7"], removidos: ["12"] }`.
- [ ] **Step 2: Rodar.** `npx vitest run lib/cliente` deve FALHAR.
- [ ] **Step 3: Implementar os helpers.** Rode de novo; deve PASSAR.
- [ ] **Step 4: Montar a página** (design §5, mockup aprovado: `layout-v3.html`, variante 1).
  - **`app/page.tsx`:** Server Component com `dynamic = "force-dynamic"`. Lê `visaoPublica(await lerEstado())`. Se receber `RIFA_NAO_INICIALIZADA`, mostra um card "Rifa ainda não inicializada". Ordem das seções: `Hero` → `Historia` → `VideoInstagram` (só se houver shortcode) → `ComoFunciona` → `SecaoReserva` (client, âncora `#numeros`).
  - **Hero:** `public/img/hero-guitarra.jpg` em cover, altura `min(70vh, 420px)`, gradiente escuro embaixo. Logo branca no topo, `titulo` em `font-display`, `subtitulo` e um botão primário "Escolher meus números ↓" que leva a `#numeros` com scroll suave.
  - **Historia:** "O que aconteceu" com `historia` dividida em parágrafos por `\n\n`. Abaixo, "X de 100 números vendidos" (só confirmados) com `Progress`.
  - **VideoInstagram:** `<iframe src="https://www.instagram.com/p/{shortcode}/embed" loading="lazy">` com proporção 4:5, largura máxima de cerca de 400px, centralizado.
  - **ComoFunciona:** 3 passos numerados; o passo 2 usa `minutosReserva`.
  - **SecaoReserva:** comportamento completo do spec §8.1 e §8.2:
    - polling a cada 15 s e no `visibilitychange`
    - `podarSelecao` a cada atualização, com toast quando algum número sair
    - `BarraSelecao` fixa embaixo, mostrando "N números · R$ X" e o botão **Reservar** com loading
    - mensagem de `NUMEROS_INDISPONIVEIS` com o texto literal do spec
    - com reserva aberta: grade somente leitura, `TimerReserva` (código do spec §8.2), `FormConfirmacao` (máscara via `mascaraTelefone`) e **Cancelar reserva**. Num `Sheet` inferior ou num card abaixo da grade, a critério do implementador.
    - `onExpirar` com `useCallback`
    - retomada a partir do `localStorage` ao carregar
    - `RESERVA_EXPIRADA` mostra "Sua reserva expirou"
  - **TelaSucesso:** texto literal do spec. Card de pagamento com o total (`formatarMoeda(n * valor)`), chave, titular, banco, botão **Copiar chave PIX** (`navigator.clipboard` + toast "Chave PIX copiada") e `instrucoesPagamento`.
  - **Mobile-first:** largura máxima de conteúdo de cerca de 640px, centralizada. A grade 10×10 cabe em 320px de largura.
- [ ] **Step 5: Verificar** com `npm run dev` em memória e viewport de 375px, num navegador ou via screenshot. Confira:
  - as seções na ordem certa
  - o botão do hero rolando até a grade
  - selecionar 2 números mostra "2 números · R$ 1.600,00"
  - depois de Reservar, aparece o timer com o texto exato do critério 4: "Você reservou os números 7, 12 e tem 9:59 para confirmar". Os números vão sem zero à esquerda, como no spec; o zero à esquerda é só na grade.
  - recarregar mantém o tempo correto (critério 4)
  - confirmar mostra a tela de sucesso com o PIX
  - cancelar libera os números
- [ ] **Step 6: Commit.** `feat: página pública da rifa`

---

### Task 10: Painel admin

**Files:**
- Create: `app/admin/login/page.tsx`, `app/admin/(protegido)/{layout,page}.tsx`, `app/admin/(protegido)/reservas/[id]/page.tsx`, `app/admin/(protegido)/configuracoes/page.tsx`, `components/admin/*`
- Test: nenhum teste unitário novo; a lógica já está coberta nas Tasks 4–5 e 7.

**Interfaces:**
- Consumes: `estaLogado`, `lerEstado({fresco:true})`, `historico.ts`, `numerosDaReserva`, `GradeNumeros`, `formatar.ts`, as rotas admin.

- [ ] **Step 1: Login e guard.**
  - `/admin/login`: um `Card` com o campo de senha. Faz POST no login; se der certo, `router.replace("/admin")`; se der 401, mostra o erro inline.
  - `(protegido)/layout.tsx`: se `!(await estaLogado())`, chama `redirect("/admin/login")`. O cabeçalho tem os links Painel / Configurações e o botão Sair (`BotaoSair`).
- [ ] **Step 2: Visão geral (`/admin`).** Segue o spec §8.3.
  - **`Resumo`:** 4 contagens, mais o valor pendente e o valor confirmado.
  - **`CardPendente`:**
    - mostra nome, telefone formatado com link `wa.me`, números pendentes, valor e "solicitada há X min"
    - ações: **Confirmar todos**, **Remover todos** (com `AlertDialog`), **Editar perfil** (`Dialog` com `FormPerfil`) e **Detalhes**
  - **`GradeAdmin`:** usa `GradeNumeros` com `renderDica` para mostrar o nome num `Tooltip`/`Popover` (toque no celular). Ao clicar, abre `HistoricoNumeroDialog` com `eventosDoNumero`.
  - **`HistoricoGeral`:** ordem do mais recente para o mais antigo, `Select` de filtro por ação, `formatarDataHora` + `descreverEvento`.
  - Depois de cada ação: toast e `router.refresh()`. Os botões ficam em loading enquanto a ação roda.
- [ ] **Step 3: Detalhe da reserva (`/admin/reservas/[id]`).**
  - `FormPerfil` com nome e telefone, botão **Salvar**, `PATCH`.
  - Tabela de números com `Badge` de status e `AcoesNumero`:
    - pendente: confirmar e remover
    - confirmado: desconfirmar e remover
    - desconfirmar e remover pedem confirmação em `AlertDialog`
  - Linha do tempo com `eventosDaReserva`.
  - Id inexistente chama `notFound()`.
- [ ] **Step 4: Configurações (`/admin/configuracoes`).**
  - `FormConfig` com os campos do design §6.1: `Input` para título, subtítulo, link do Instagram, chave PIX, titular e banco; `Textarea` para história e instruções de pagamento.
  - Envia só os campos alterados via `PATCH /api/admin/config`.
  - Erros `DADOS_INVALIDOS` aparecem em toast com a mensagem do servidor.
  - Um aviso explica que valor, quantidade de números e tempo de reserva só mudam no `rifa.json`.
- [ ] **Step 5: Verificar** com `npm run dev` em memória:
  - `/admin` sem login redireciona para `/admin/login` (critério 9)
  - login com `teste`
  - criar uma reserva pela página pública e confirmá-la
  - ver o card pendente
  - Confirmar todos
  - abrir Detalhes, desconfirmar o 7 e removê-lo
  - abrir o histórico do 7 e ver os eventos em ordem
  - editar o perfil e conferir o evento `perfil_editado` no histórico geral
  - mudar a história e a chave PIX em Configurações; depois de recarregar `/`, os textos e o PIX da tela de sucesso refletem a mudança
- [ ] **Step 6: Commit.** `feat: painel admin`

---

### Task 11: README e verificação Cloudflare

**Files:**
- Create/Modify: `README.md`

- [ ] **Step 1: Escrever o `README.md`** em português. Seções:
  - visão geral e link para `spec.md` e para o design
  - rodar localmente (modo memória sem token; modo GitHub com `.env.local`)
  - criar o token fine-grained (spec §3.2)
  - primeiro uso, nesta ordem: `git push -u origin main` → `npm run seed` → `git pull` → `npx wrangler login` → `wrangler secret put GITHUB_TOKEN` / `ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET` → `npm run deploy`
  - avisos: `git pull` antes de todo push; nunca editar nem commitar `rifa.json` local; o token tem escrita no repo do código
  - editar conteúdo: em `/admin/configuracoes`, ou no `rifa.json` para valor, faixa de números e tempo de reserva
  - checklist de verificação ao vivo, com os critérios 2, 6 e 12 contra o GitHub real: duas abas reservando o mesmo número ao mesmo tempo; reserva expirada aparece no próximo commit; mensagens dos commits
- [ ] **Step 2: Verificar** que `npx vitest run` passa, `npm run lint` não tem erros e `npm run build` dá sucesso. `npm run preview` deve subir o worker local; com `.dev.vars` sem token, `GET /api/rifa` responde 500 ou 503 com o JSON de erro padrão em vez de travar (em produção o modo memória fica desligado). Se `preview` falhar por causa do runtime (Buffer, crypto), corrija sem mudar os contratos.
- [ ] **Step 3: Commit.** `docs: README com setup, seed e deploy Cloudflare`
- [ ] **Step 4: Avisar o usuário** que está tudo commitado localmente e que o próximo comando é dele: `! git push -u origin main`.
