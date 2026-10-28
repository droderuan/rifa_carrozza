# Juntos pela Carrozza — Rifa solidária

Rifa de 100 números para ajudar a reconstruir a fábrica da [Carrozza Custom Guitars](https://www.carrozza.com.br/).

- Regras de negócio, API e telas: [`spec.md`](spec.md)
- O que mudou em relação ao spec (Cloudflare, visual, edição pelo painel): [`docs/superpowers/specs/2026-10-27-rifa-carrozza-design.md`](docs/superpowers/specs/2026-10-27-rifa-carrozza-design.md)

Stack: Next.js (App Router) + shadcn/ui, hospedado no **Cloudflare Workers** via `@opennextjs/cloudflare`. Não há banco de dados: o estado inteiro fica em `rifa.json` **neste mesmo repositório**, lido e gravado pela GitHub Contents API (cada alteração vira um commit).

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha ADMIN_PASSWORD e ADMIN_SESSION_SECRET
npm run dev                  # http://localhost:3000  ·  painel em /admin
npm test                     # testes do domínio e da camada de dados
```

- **Sem `GITHUB_TOKEN`** no `.env.local`, o `npm run dev` usa um armazenamento **em memória** (zera ao reiniciar). Bom para mexer nas telas sem tocar nos dados reais.
- **Com `GITHUB_TOKEN`**, o dev lê e grava o `rifa.json` de verdade no GitHub. Cuidado: são os dados reais.

## Token do GitHub

Crie um **fine-grained personal access token** em <https://github.com/settings/personal-access-tokens/new>:

- *Repository access:* apenas `droderuan/rifa_carrozza`.
- *Permissions → Repository → Contents:* **Read and write**. Nenhuma outra.

> O token tem escrita neste repositório, que também contém o código. Ele só existe no servidor (segredo do Cloudflare) e no seu `.env.local`, nunca no navegador.

## Primeiro uso (nesta ordem)

```bash
# 1. Suba o código (o repositório no GitHub deve ser PRIVADO)
git push -u origin main

# 2. Crie o rifa.json no GitHub (precisa de GITHUB_TOKEN no .env.local)
npm run seed

# 3. Traga o commit do seed para a sua cópia local
git pull

# 4. Configure o Cloudflare e os segredos
npx wrangler login
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put ADMIN_SESSION_SECRET   # string aleatória longa, ex.: openssl rand -hex 32

# 5. Publique
npm run deploy
```

`GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH` e `GITHUB_DB_PATH` já estão em `vars` no `wrangler.jsonc`.

Para testar o build do Worker localmente antes de publicar: `cp .dev.vars.example .dev.vars`, preencha e rode `npm run preview`.

## ⚠️ Código e dados no mesmo repositório

O app commita o `rifa.json` no `main` a cada reserva e a cada ação do painel. Por isso:

- **Sempre rode `git pull` antes de `git push`.** Senão o push é rejeitado.
- **Nunca edite nem commite o `rifa.json` local.** Isso sobrescreveria vendas feitas pelo site. Se precisar mexer no arquivo, edite direto no GitHub.
- O histórico de commits é o backup: qualquer versão anterior do `rifa.json` pode ser restaurada pelo GitHub.

## Editar o conteúdo

- **Pelo painel** (`/admin/configuracoes`): título, subtítulo, texto "O que aconteceu", link do vídeo do Instagram, chave PIX, titular, banco e instruções de pagamento.
- **Pelo `rifa.json` no GitHub** (com cuidado): valor por número (`valorPorNumeroCentavos`), faixa de números (`primeiro`/`ultimo`), tempo de reserva (`minutosReserva`) e limite por reserva (`maxPorReserva`).

## Verificação ao vivo (depois do primeiro deploy)

Itens que dependem do GitHub real e não são cobertos pelos testes automáticos:

- [ ] Duas abas (ou dois celulares) reservam o mesmo número quase ao mesmo tempo: uma consegue, a outra vê "Os números … acabaram de ser reservados por outra pessoa". No `rifa.json`, o número aparece numa única reserva.
- [ ] Reserve um número e espere passar o prazo (10 min + 30 s). A grade mostra o número livre **sem** gerar commit. Na próxima ação qualquer, o commit inclui o evento `expirado` e a reserva fica `expirada`.
- [ ] Cada operação gera exatamente um commit com mensagem `[rifa] <acao> <reserva> <numeros>` (ex.: `[rifa] reservado r_8f2k91ab0c 7,12`); salvar as configurações gera `[rifa] config_editada`.
- [ ] O painel `/admin` sem login redireciona para `/admin/login`.
