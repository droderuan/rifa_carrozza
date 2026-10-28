# Rifa Carrozza — Design

Data: 2026-10-27

## 1. Intenção

A fábrica da **Carrozza Custom Guitars** (Jaú/SP — https://www.carrozza.com.br/) sofreu um desabamento. A rifa arrecada dinheiro para a reconstrução. O site é uma ajuda pessoal do autor ao cliente; o público é o pessoal do grupo de WhatsApp, que vai abrir o link **no celular**.

O comportamento do sistema está definido em **`spec.md`** (raiz do repositório), que continua sendo a fonte da verdade para regras de negócio, modelo de dados, API, painel admin, autenticação e critérios de aceite. Este documento registra **apenas o que muda ou se acrescenta** ao `spec.md`. Onde os dois não tratam do mesmo assunto, vale o `spec.md`; onde conflitam, vale este documento.

## 2. Objetivos, não-objetivos, anti-objetivos

**Objetivos**
- Implementar tudo do `spec.md` (seções 1–12), incluindo os testes Vitest de `lib/dominio/`.
- Next.js (App Router) + **shadcn/ui** + Tailwind, visual moderno e escuro, mobile-first.
- Rodar no **Cloudflare** com deploy manual.
- Página pública que primeiro conta a história (contexto) e só depois, ao rolar, mostra a grade de reserva.

**Não-objetivos**
- Deploy automático / CI. Não há integração git → Cloudflare.
- Seção de "prêmio" na página (foi removida explicitamente).
- Pagamento online (já fora de escopo no `spec.md`).

**Anti-objetivos** (seria falha mesmo funcionando)
- Expor nome/telefone de compradores em qualquer resposta pública.
- Página pesada ou difícil de usar no celular / aberta a partir do WhatsApp.
- Visual "genérico de template" que não lembre a Carrozza.

## 3. Restrições e decisões do usuário

- **Framework/UI:** Next.js + shadcn/ui (decidido pelo usuário).
- **Hospedagem:** Cloudflare (decidido pelo usuário). Deploy **manual** (decidido pelo usuário).
- **"Banco de dados":** o `rifa.json` fica **no mesmo repositório GitHub deste projeto** (decidido pelo usuário), no branch `main` (sem deploy automático, não há problema de commits disparando builds). O repositório deve ser **privado**.
- **Repositório git:** criar localmente (`git init` + commits). O usuário cria o remoto no GitHub e faz o push depois.
- **Valor:** **R$ 800,00 por número** (`valorPorNumeroCentavos: 80000`) — decidido pelo usuário.
- **PIX:** chave **14996577711** (telefone), titular **Alexandre Carrozza**, **Banco do Brasil** — informado pelo usuário.
- **Vídeo:** embed do post do Instagram https://www.instagram.com/p/De-Mr-gBsLA/ — pedido pelo usuário.
- **Visual:** cabeçalho com foto grande (estilo "solidário") + grade no estilo "palco escuro" (preto com dourado), **página inteira escura** — escolhido pelo usuário nos mockups (`.superpowers/brainstorm/.../content/layout-v3.html`, variante 1).
- **Foto do topo:** uma guitarra da Carrozza (a amarelo-neon do site deles), não um violão — pedido pelo usuário.

## 4. Adaptações ao `spec.md`

### 4.1 Cloudflare (escolha do builder/assistente)

- Usar **`@opennextjs/cloudflare`** (adaptador OpenNext oficial para Workers), com `compatibility_flags = ["nodejs_compat"]` no `wrangler.jsonc`. Next.js na versão estável mais recente suportada pelo adaptador.
- Onde o `spec.md` cita Vercel, entenda Cloudflare Workers. `export const runtime = "nodejs"` permanece (é o runtime suportado pelo OpenNext; **não** usar `"edge"`).
- `Buffer` funciona via `nodejs_compat`; manter o código da seção 6.1 do `spec.md`. Se algo não funcionar no Workers, trocar por `btoa`/`atob` + `TextEncoder/TextDecoder` sem mudar o contrato.
- O GitHub exige header `User-Agent` nas requisições; adicionar `"User-Agent": "rifa-carrozza"` em `headers()` (fetch do Workers não envia um por padrão).
- O cache em memória de 5 s (spec 6.3) vive por isolate do Worker. Aceitável — é só proteção de rate limit.
- **Segredos:** em produção via `wrangler secret put` (`GITHUB_TOKEN`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`); `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH`, `GITHUB_DB_PATH` em `vars` no `wrangler.jsonc` ou também como secret. Localmente, `.dev.vars` (para `wrangler`/preview) e `.env.local` (para `next dev` e `npm run seed`), ambos no `.gitignore`. Fornecer `.dev.vars.example`.
- **Scripts npm:** `dev` (next dev), `build`, `preview` (opennextjs-cloudflare build + preview local no workerd), `deploy` (opennextjs-cloudflare build + deploy), `test` (vitest), `seed` (`tsx scripts/seed.ts`, lendo `.env.local`).
- Cookie `admin_session`: `secure` só quando não for `localhost`/desenvolvimento, para o login funcionar em `next dev` (escolha do assistente).

### 4.2 Mesmo repositório para código e dados

- `GITHUB_BRANCH` padrão `main`, `GITHUB_DB_PATH` padrão `rifa.json` (na raiz do repo).
- Consequência documentada no README: como o app commita `rifa.json` no remoto, é preciso `git pull` antes de `git push` de mudanças de código. **Nunca** editar `rifa.json` localmente e dar push (sobrescreveria vendas). O `rifa.json` **não** é criado no commit inicial — ele nasce pelo `npm run seed`.
- O token fine-grained tem *Contents: Read and write* neste repositório (que também contém o código). Documentar no README.

### 4.3 Config estendida (escolha do assistente)

`Config` (spec 4.1) ganha campos opcionais para o conteúdo da página. Tudo editável depois no `rifa.json` pelo GitHub:

```ts
export interface Config {
  // ...campos do spec.md...
  subtitulo?: string;          // linha abaixo do título no topo
  historia?: string;           // texto de "O que aconteceu" (parágrafos separados por \n\n)
  instagramUrl?: string;       // URL do post; se ausente, a seção de vídeo não aparece
  pix?: { chave: string; titular: string; banco: string };
}
```

`GET /api/rifa` passa a retornar esses campos dentro de `config` (nenhum deles é dado pessoal de comprador).

**Config padrão do seed:**

```json
{
  "titulo": "Juntos pela Carrozza",
  "subtitulo": "Rifa solidária para reconstruir a fábrica em Jaú",
  "descricao": "Rifa solidária para a reconstrução da fábrica da Carrozza Custom Guitars.",
  "historia": "[TEXTO DE EXEMPLO — editar no rifa.json] Parte da fábrica da Carrozza, em Jaú, desabou. Toda a renda desta rifa vai para a reconstrução da oficina onde nascem as guitarras.",
  "valorPorNumeroCentavos": 80000,
  "primeiro": 1,
  "ultimo": 100,
  "minutosReserva": 10,
  "maxPorReserva": null,
  "instagramUrl": "https://www.instagram.com/p/De-Mr-gBsLA/",
  "pix": { "chave": "14996577711", "titular": "Alexandre Carrozza", "banco": "Banco do Brasil" },
  "instrucoesPagamento": "Depois do PIX, envie o comprovante no grupo do WhatsApp."
}
```

## 5. Página pública (`/`) — layout

Página única, **toda escura**, uma coluna, mobile-first (máx. ~640px de largura de conteúdo, centralizada no desktop). De cima para baixo:

1. **Hero:** foto de guitarra Carrozza (amarelo-neon, fundo escuro) ocupando ~300–400px de altura, com gradiente escuro embaixo; logo branca da Carrozza no topo; `titulo` grande; `subtitulo`; botão **"Escolher meus números ↓"** que faz scroll suave até a grade.
2. **O que aconteceu:** `historia` + progresso "**X de 100 números vendidos**" com barra (shadcn `Progress`). *Escolha do assistente:* "vendidos" = status `confirmado` apenas.
3. **Vídeo:** título curto (ex.: "Veja o recado da Carrozza") + embed do Instagram via `<iframe src="https://www.instagram.com/p/<shortcode>/embed">` (shortcode extraído de `instagramUrl`), lazy-load, proporção ~4:5.
4. **Como funciona:** 3 passos numerados — escolher números e reservar; informar nome e telefone em até `minutosReserva` minutos; fazer o PIX e mandar o comprovante, o organizador confirma.
5. **Grade (âncora `#numeros`):** título "Escolha seus números", "R$ 800,00 cada", grade 10×10 + legenda. Comportamento integral do spec 8.1/8.2.
6. **Barra fixa inferior** (aparece quando há seleção ou reserva ativa): "N números · R$ X" + botão **Reservar**. Com reserva aberta, timer + formulário (nome, telefone com máscara) + Cancelar — pode ser um `Sheet`/`Drawer` do shadcn ou um card abaixo da grade; escolha do builder, priorizando usabilidade no celular.
7. **Tela de sucesso:** mensagem do spec 8.1 + bloco de pagamento com valor total, chave PIX, titular, banco e **botão "Copiar chave PIX"** (escolha do assistente) + `instrucoesPagamento`.

**Paleta (referência do mockup aprovado):**
- Fundo `#0b0b0c`; superfícies `#141416`; bordas `#27272a`; texto `#f4f4f5`; texto secundário `#a1a1aa`.
- Destaque dourado `#f5b301` (botões primários, selecionado, barra de progresso).
- Status na grade: livre `#1c1c1f` com borda `#2e2e33`; **selecionado** `#f5b301` texto escuro; reservado `#3f3f46` texto `#71717a`; pendente `#52410f` texto `#c9a227`; confirmado/vendido `#18181b` texto `#3f3f46` riscado.
- Fontes: Inter (texto) e Space Grotesk (títulos), via `next/font`.
- Implementar como tema do shadcn (variáveis CSS em `globals.css`, tema escuro fixo, sem alternância claro/escuro).

**Imagens:** baixar e servir de `public/` (não hotlinkar o Wix):
- Hero: `https://static.wixstatic.com/media/2eaac7_a86e550caec045248e821f1f0c124270~mv2.jpg` (guitarra amarelo-neon).
- Logo branca: `https://static.wixstatic.com/media/a47240_2045e3195de24171a4040524e1b4ec61~mv2.png`.
- Usar `next/image` com `unoptimized` (ou `<img>`), já que o otimizador de imagens do Next não está disponível por padrão no OpenNext/Cloudflare.

## 6. Painel admin

### 6.1 Edição do conteúdo e do PIX (pedido do usuário)

O admin edita pelo painel os **dados do PIX** e os **textos** da página, sem precisar mexer no `rifa.json` no GitHub.

- Nova página **`/admin/configuracoes`** (link no painel), com formulário shadcn (`Input`, `Textarea`, botão **Salvar** com estado de carregamento).
- Campos editáveis: `titulo`, `subtitulo`, `historia`, `instagramUrl`, `pix.chave`, `pix.titular`, `pix.banco`, `instrucoesPagamento`. *Escolha do assistente:* incluí os outros textos da página além do PIX e da história, porque o mecanismo é o mesmo.
- **Não editáveis no painel** (escolha do assistente): `valorPorNumeroCentavos`, `primeiro`, `ultimo`, `minutosReserva`, `maxPorReserva`. Mudá-los no meio da rifa quebraria valores já combinados ou a integridade dos números; continuam ajustáveis só no `rifa.json`.
- Nova rota **`PATCH /api/admin/config`** (com `exigirAdmin()`), corpo com qualquer subconjunto dos campos acima. Validação: strings com `trim`; `titulo` 2–80 caracteres; `subtitulo` ≤ 160; `historia` ≤ 4000; `instrucoesPagamento` ≤ 2000; `instagramUrl` vazio ou URL `https://www.instagram.com/(p|reel)/<código>/`; `pix.*` não vazios quando enviados. Erro → `DADOS_INVALIDOS`. Se nada mudou, 200 sem gravar.
- Grava pelo `atualizar()` (CAS do spec 6.2), com uma função pura `editarConfig` em `lib/dominio/config.ts` (testada no Vitest). Commit: `[rifa] config_editada`.
- **Não gera `Evento`.** O tipo `Evento` exige `reserva`, e o histórico de commits do GitHub já serve como auditoria da config. *Escolha do assistente.*
- Depois de salvar, `invalidarCache()`. A página pública reflete a mudança em até 5 s nas outras instâncias.
- A tela de sucesso do comprador monta o bloco de pagamento a partir de `pix` (chave, titular, banco, botão copiar) + `instrucoesPagamento` como texto livre adicional. Assim a chave PIX fica num lugar só.

### 6.2 Demais telas

Conforme `spec.md` 8.3, com o mesmo tema escuro e componentes shadcn (`Card`, `Table`, `Dialog`/`AlertDialog` para ações destrutivas, `Badge` para status, `Tabs` ou seções, `Select` para filtro de ação, `Tooltip`/`Popover` para o nome na grade admin). Valores formatados com R$ 800,00 por número. Sem mockup — o builder decide o layout seguindo o spec.

## 7. Repositório

- `git init` na raiz; `.gitignore` inclui `node_modules`, `.next`, `.open-next`, `.wrangler`, `.env*`, `.dev.vars`, `.superpowers/`.
- O `spec.md` e este documento entram no repositório.
- README em português: setup local, criação do token fine-grained, `npm run seed`, `wrangler secret put`, `npm run deploy`, e o aviso de `git pull` antes de push (seção 4.2).
- Remoto: `git remote add origin git@github.com:droderuan/rifa_carrozza.git` (informado pelo usuário). Assim, `GITHUB_OWNER=droderuan` e `GITHUB_REPO=rifa_carrozza`.
- **Não fazer push nem pull.** A chave SSH do usuário tem senha, então o usuário roda esses comandos. Ao final, avisar qual comando rodar (ex.: `! git push -u origin main`).

## 8. Testes

- Vitest para todas as funções de `lib/dominio/` cobrindo as transições válidas e inválidas da seção 5.1 do spec e as validações da 5.3 (critério de aceite 13), incluindo o cenário de histórico do critério 11.
- Teste de `atualizar` (spec 6.2) com `lerArquivo`/`gravarArquivo` mockados, cobrindo retry em conflito e o critério 2 (duas reservas do mesmo número → um sucesso, um `NUMEROS_INDISPONIVEIS`). *Escolha do assistente.*
- `npm run build` e `npm run preview` (opennext) devem completar sem erros.
- **Sem credenciais reais durante a construção** (escolha do assistente): o repositório remoto e a conta Cloudflare só existem depois que o usuário fizer o push. A verificação usa testes com mocks + `npm run preview` com variáveis de exemplo. Os critérios que dependem de GitHub real (2, 6 e 12 do spec) ficam num checklist de "verificação ao vivo" no README, para rodar depois do primeiro deploy.
- **Ordem no primeiro uso** (documentar no README): criar o repo privado → `git push` do código → `npm run seed` (que commita `rifa.json` direto no `main` remoto) → `git pull` → `npm run deploy`.

## 9. Deixado para o builder

- Layout exato do painel admin e do formulário de reserva (sheet vs. card), respeitando o spec e o tema.
- Estrutura interna dos componentes além das listadas no spec 11.
- Detalhes de microcopy fora dos textos já definidos no spec e aqui.

## 10. Mudança: reserva ao tocar no número (pedido do usuário, 2026-10-27)

Substitui o fluxo "selecionar → botão Reservar" do spec §8.1.

- **Tocar num número livre** já reserva: o primeiro toque cria a reserva (`POST /api/reservas`) e inicia a contagem de `minutosReserva`; os seguintes entram na mesma reserva (`POST /api/reservas/[id]/numeros`, evento `reservado`). **O prazo não reinicia** ao adicionar números (escolha do assistente — evita segurar números indefinidamente).
- **Tocar de novo num número seu** o libera (`POST /api/reservas/[id]/liberar`, evento `cancelado` só com esse número). Sem números, a reserva vira `cancelada`.
- Os toques de um mesmo navegador vão para o servidor em fila, um por vez; o número pulsa enquanto a ação está em andamento.
- Barra fixa inferior mostra quantidade, total, a contagem regressiva e o botão **Confirmar**, que leva ao formulário (nome + telefone), exibido abaixo da grade.
- **Atualização da grade:** a cada **5 s** com a aba visível, e ao voltar o foco. Cache de `GET /api/rifa` por instância reduzido para **4 s** (protege o limite de ~5.000 leituras/h do token).
- **Custo:** cada toque é um commit. O limite secundário do GitHub (~80 escritas/min) passa a valer por toque, não por compra; com muita gente tocando ao mesmo tempo, algumas ações podem demorar (retentativas) ou falhar com `CONFLITO_PERSISTENTE`.

## 11. Mudança: branches só de dados (pedido do usuário, 2026-10-27)

Substitui o §4.2 ("rifa.json no `main`").

- Os dados ficam em branches **órfãos** do mesmo repositório, só com o `rifa.json`: **`dados-producao`** (site publicado, `wrangler.jsonc`) e **`dados-teste`** (testes locais, `.env.local` / `.dev.vars`). Nomes: escolha do assistente.
- `GITHUB_BRANCH` passa a ser **obrigatório** (sem padrão `main`): se faltar, leitura e escrita falham com erro, em vez de gravar no branch do código.
- `npm run seed` cria o branch órfão pela Git Data API (tree → commit sem pais → ref) quando ele não existe; se o branch existir sem o arquivo, cria o arquivo; se o arquivo existir, não faz nada.
- Consequência: o app nunca commita no `main`, então não há mais a regra de `git pull` antes de push do código.
