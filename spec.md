# Spec — Sistema de Rifa

## 1. Visão geral

Aplicação Next.js (App Router) para gerenciar uma rifa de 100 números. O comprador seleciona números livres, que ficam **reservados** por tempo limitado. Para confirmar a reserva, ele informa o nome e o telefone que usa no grupo do WhatsApp. A partir daí os números ficam **pendentes** até o organizador (admin) **confirmar** ou **remover a atribuição** pelo painel.

Não há banco de dados. Todo o estado fica num único arquivo JSON (`rifa.json`) dentro de um repositório **privado** do GitHub. O servidor do Next.js lê e grava esse arquivo pela GitHub Contents API, e cada escrita gera um commit.

**Fora de escopo:** pagamento online, múltiplas rifas, contas de usuário para compradores e proteção contra uso indevido de reservas alheias (o id da reserva no navegador basta para identificar o comprador).

---

## 2. Glossário

| Termo                  | Significado                                                                                               |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| **Número**             | Cada um dos 100 números da rifa. Tem um status e, se não estiver livre, aponta para uma reserva.          |
| **Reserva**            | Conjunto de números escolhido de uma vez por um comprador. Nasce `aberta`, com prazo e sem nome/telefone. |
| **Confirmar reserva**  | Ação do **comprador**: envia nome e telefone dentro do prazo. Os números passam a `pendente`.             |
| **Confirmar número**   | Ação do **admin**: marca números pendentes como `confirmado` (ex.: após receber o pagamento).             |
| **Desconfirmar**       | Ação do admin: volta um número de `confirmado` para `pendente`.                                           |
| **Remover atribuição** | Ação do admin: desvincula o número da reserva e o devolve para `livre`.                                   |
| **Perfil da reserva**  | Nome e telefone gravados na reserva. O admin pode corrigi-los.                                            |
| **Evento**             | Registro imutável de cada mudança, usado para o histórico.                                                |

---

## 3. Arquitetura

- **Next.js** com App Router. As APIs ficam em Route Handlers com `export const runtime = "nodejs"` e `export const dynamic = "force-dynamic"`.
- **Armazenamento:** `rifa.json` num repositório privado do GitHub, acessado só pelo servidor.
- **Hospedagem:** qualquer plataforma serverless (ex.: Vercel). Nada é gravado em disco.
- **Concorrência:** controle otimista pelo `sha` do arquivo (seção 6.2).

### 3.1 Variáveis de ambiente

| Variável               | Obrigatória | Descrição                                                       |
| ---------------------- | ----------- | --------------------------------------------------------------- |
| `GITHUB_TOKEN`         | sim         | Fine-grained personal access token                              |
| `GITHUB_OWNER`         | sim         | Dono do repositório (usuário ou organização)                    |
| `GITHUB_REPO`          | sim         | Nome do repositório privado                                     |
| `GITHUB_BRANCH`        | não         | Padrão `main`                                                   |
| `GITHUB_DB_PATH`       | não         | Padrão `rifa.json`                                              |
| `ADMIN_PASSWORD`       | sim         | Senha única do painel                                           |
| `ADMIN_SESSION_SECRET` | sim         | Segredo para assinar o cookie do admin (string aleatória longa) |

### 3.2 Token do GitHub

Crie um **fine-grained personal access token** com estas configurações:

- _Repository access:_ apenas o repositório da rifa.
- _Permissions → Repository → Contents:_ **Read and write**.
- Nenhuma outra permissão.

O token só existe no servidor e nunca é exposto ao cliente.

---

## 4. Modelo de dados

### 4.1 Tipos

```ts
// lib/dominio/tipos.ts
export type StatusNumero = "livre" | "reservado" | "pendente" | "confirmado";
export type StatusReserva = "aberta" | "solicitada" | "expirada" | "cancelada";

export interface Config {
  titulo: string;
  descricao: string;
  valorPorNumeroCentavos: number; // ex.: 1000 = R$ 10,00
  primeiro: number; // 1
  ultimo: number; // 100
  minutosReserva: number; // ex.: 10
  maxPorReserva: number | null; // null = sem limite
  instrucoesPagamento: string; // texto exibido após a confirmação da reserva
}

export interface Reserva {
  id: string; // "r_" + 10 caracteres aleatórios
  status: StatusReserva;
  nome: string | null; // null enquanto aberta
  telefone: string | null; // só dígitos, com DDD, sem 55. null enquanto aberta
  criadaEm: string; // ISO 8601 UTC
  expiraEm: string; // ISO 8601 UTC (criadaEm + minutosReserva)
  solicitadaEm: string | null; // quando o comprador confirmou
}

export interface Numero {
  status: StatusNumero;
  reserva: string | null; // null se e somente se status === "livre"
}

export type AcaoEvento =
  | "reservado" // comprador reservou
  | "solicitado" // comprador confirmou a reserva (nome/telefone)
  | "cancelado" // comprador cancelou a reserva aberta
  | "expirado" // reserva aberta venceu sem confirmação
  | "confirmado" // admin confirmou
  | "desconfirmado" // admin desfez a confirmação
  | "removido" // admin removeu a atribuição
  | "perfil_editado"; // admin corrigiu nome/telefone

export interface Evento {
  em: string; // ISO 8601 UTC
  acao: AcaoEvento;
  por: "comprador" | "admin" | "sistema";
  reserva: string;
  numeros: string[]; // vazio em perfil_editado
  nome?: string; // snapshot do perfil no momento do evento
  telefone?: string;
  de?: { nome?: string; telefone?: string }; // só em perfil_editado
  para?: { nome?: string; telefone?: string }; // só em perfil_editado
}

export interface Estado {
  versao: 1;
  config: Config;
  reservas: Record<string, Reserva>;
  numeros: Record<string, Numero>; // chave: número como string sem zeros à esquerda ("1".."100")
  eventos: Evento[]; // append-only
}
```

### 4.2 Regras de integridade

- `numeros` tem exatamente uma chave para cada inteiro de `config.primeiro` a `config.ultimo`.
- `numeros[n].status === "livre"` ⇔ `numeros[n].reserva === null`.
- Um número em `reservado` aponta para uma reserva `aberta`.
- Um número em `pendente` ou `confirmado` aponta para uma reserva `solicitada`.
- Os números de uma reserva não ficam gravados nela. São derivados: todos os `numeros` cuja `reserva` é o id dela.
- `eventos` nunca é editado nem tem itens removidos.
- O **snapshot** de `nome`/`telefone` entra nos eventos `solicitado`, `confirmado`, `desconfirmado` e `removido`. Os eventos `reservado`, `cancelado` e `expirado` não têm identidade.

### 4.3 Exemplo

```json
{
  "versao": 1,
  "config": {
    "titulo": "Rifa do Fulano",
    "descricao": "Prêmio: ...",
    "valorPorNumeroCentavos": 1000,
    "primeiro": 1,
    "ultimo": 100,
    "minutosReserva": 10,
    "maxPorReserva": null,
    "instrucoesPagamento": "Envie o PIX para ... e mande o comprovante no grupo."
  },
  "reservas": {
    "r_8f2k91ab0c": {
      "id": "r_8f2k91ab0c",
      "status": "solicitada",
      "nome": "Maria Souza",
      "telefone": "21999998888",
      "criadaEm": "2026-10-28T00:05:00.000Z",
      "expiraEm": "2026-10-28T00:15:00.000Z",
      "solicitadaEm": "2026-10-28T00:09:12.000Z"
    }
  },
  "numeros": {
    "1": { "status": "livre", "reserva": null },
    "7": { "status": "pendente", "reserva": "r_8f2k91ab0c" },
    "12": { "status": "pendente", "reserva": "r_8f2k91ab0c" }
  },
  "eventos": [
    {
      "em": "2026-10-28T00:05:00.000Z",
      "acao": "reservado",
      "por": "comprador",
      "reserva": "r_8f2k91ab0c",
      "numeros": ["7", "12"]
    },
    {
      "em": "2026-10-28T00:09:12.000Z",
      "acao": "solicitado",
      "por": "comprador",
      "reserva": "r_8f2k91ab0c",
      "numeros": ["7", "12"],
      "nome": "Maria Souza",
      "telefone": "21999998888"
    }
  ]
}
```

---

## 5. Regras de negócio

### 5.1 Transições

| Ação               | Ator      | Status do número: de → para          | Status da reserva       | Evento           |
| ------------------ | --------- | ------------------------------------ | ----------------------- | ---------------- |
| Reservar           | comprador | `livre` → `reservado`                | nova, `aberta`          | `reservado`      |
| Confirmar reserva  | comprador | `reservado` → `pendente`             | `aberta` → `solicitada` | `solicitado`     |
| Cancelar reserva   | comprador | `reservado` → `livre`                | `aberta` → `cancelada`  | `cancelado`      |
| Expirar            | sistema   | `reservado` → `livre`                | `aberta` → `expirada`   | `expirado`       |
| Confirmar número   | admin     | `pendente` → `confirmado`            | —                       | `confirmado`     |
| Desconfirmar       | admin     | `confirmado` → `pendente`            | —                       | `desconfirmado`  |
| Remover atribuição | admin     | `pendente` ou `confirmado` → `livre` | —                       | `removido`       |
| Editar perfil      | admin     | —                                    | continua `solicitada`   | `perfil_editado` |

Qualquer outra transição é rejeitada com `TRANSICAO_INVALIDA`.

Uma reserva `solicitada` pode ficar sem nenhum número depois de remoções. Ela continua existindo para o histórico.

### 5.2 Expiração

- Constante `TOLERANCIA_MS = 30_000`.
- Uma reserva está **efetivamente expirada** quando `status === "aberta"` e `agora > expiraEm + TOLERANCIA_MS`.
- A tolerância serve para que quem clica no último segundo não perca a reserva por causa da latência. Para o comprador, o prazo exibido é sempre `expiraEm`, sem a tolerância.
- **Não há cron.** A função pura `aplicarExpiracoes(estado, agora)` faz o seguinte:
  1. Para cada reserva efetivamente expirada, muda o status para `expirada`.
  2. Os números com `reserva === id` e `status === "reservado"` voltam para `livre` com `reserva: null`.
  3. Adiciona um evento `expirado` com `em: reserva.expiraEm`, `por: "sistema"` e os números liberados.
- **Na leitura** (grade pública, painel), a função roda sobre uma cópia em memória e o resultado não é persistido.
- **Na escrita**, roda antes de toda mutação, e o resultado vai no mesmo commit.

### 5.3 Validações

- **Números da reserva:**
  - Array de strings, sem repetição, com tamanho entre 1 e `maxPorReserva` (se definido).
  - Cada um precisa existir em `estado.numeros`.
  - Todos precisam estar `livre` depois de `aplicarExpiracoes`. Se algum não estiver, a reserva inteira falha com `NUMEROS_INDISPONIVEIS` e a lista dos indisponíveis.
- **Nome:**
  - `trim`, com espaços repetidos colapsados.
  - Entre 2 e 80 caracteres.
- **Telefone:**
  - Remover tudo que não é dígito.
  - Se começar com `55` e tiver 12–13 dígitos, remover o `55`.
  - O resultado precisa ter 10 ou 11 dígitos, com DDD entre 11 e 99.
  - Gravar só os dígitos.
- **Confirmar reserva:**
  - A reserva existe e está `aberta`.
  - `agora <= expiraEm + TOLERANCIA_MS`.
  - Todos os números dela continuam `reservado`.
- **Ações do admin com `numeros` explícito:**
  - Todos os números informados pertencem à reserva.
  - Todos estão no status de origem exigido pela transição.
  - Se algum falhar, a ação inteira falha.
- **Ações do admin sem `numeros`:** a ação se aplica a todos os números da reserva que estão no status de origem exigido. Se não houver nenhum, retorna `TRANSICAO_INVALIDA`.
- **Editar perfil:**
  - Só para reservas `solicitada`.
  - Usa as mesmas validações de nome e telefone.
  - Se nada mudou, retorna 200 sem gravar.

### 5.4 Ids e datas

- Id da reserva: `"r_" + 10 caracteres [a-z0-9]` aleatórios (ex.: com `crypto.getRandomValues`). Gere-o **fora** da função de mutação e confira se não colide com uma reserva existente.
- Grave as datas em UTC (`new Date().toISOString()`) e exiba-as em `America/Sao_Paulo` com `Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", ... })`.

---

## 6. Camada de armazenamento

### 6.1 Acesso ao GitHub (`lib/github.ts`)

```ts
const API = "https://api.github.com";

function urlArquivo() {
  const path = process.env.GITHUB_DB_PATH ?? "rifa.json";
  return `${API}/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${path}`;
}

function headers() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

const branch = () => process.env.GITHUB_BRANCH ?? "main";

export async function lerArquivo(): Promise<{ estado: Estado; sha: string }> {
  const res = await fetch(`${urlArquivo()}?ref=${branch()}`, {
    headers: headers(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GitHub GET ${res.status}`);
  const json = await res.json();
  const texto = Buffer.from(json.content, "base64").toString("utf8");
  return { estado: JSON.parse(texto), sha: json.sha };
}

export async function gravarArquivo(
  estado: Estado,
  sha: string | null,
  mensagem: string,
): Promise<"ok" | "conflito"> {
  const res = await fetch(urlArquivo(), {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({
      message: mensagem,
      content: Buffer.from(JSON.stringify(estado, null, 2)).toString("base64"),
      branch: branch(),
      ...(sha ? { sha } : {}),
    }),
  });
  if (res.ok) return "ok";
  if (res.status === 409) return "conflito";
  throw new Error(`GitHub PUT ${res.status}: ${await res.text()}`);
}
```

Leia sempre pela API, nunca por `raw.githubusercontent.com`. A CDN do raw serve versões antigas por alguns minutos.

### 6.2 Escrita com controle otimista (`lib/db.ts`)

```ts
export async function atualizar(
  mensagem: string,
  mutacao: (estado: Estado, agora: Date) => void, // altera o estado recebido; lança ErroDominio
): Promise<Estado> {
  for (let tentativa = 1; tentativa <= 5; tentativa++) {
    const { estado, sha } = await lerArquivo();
    const agora = new Date();
    aplicarExpiracoes(estado, agora);
    mutacao(estado, agora); // ErroDominio sobe direto, sem nova tentativa
    const r = await gravarArquivo(estado, sha, mensagem);
    if (r === "ok") {
      invalidarCache();
      return estado;
    }
    await esperar(150 * tentativa + Math.random() * 150);
  }
  throw new ErroDominio(
    "CONFLITO_PERSISTENTE",
    503,
    "Muitas alterações ao mesmo tempo, tente novamente.",
  );
}
```

Requisitos:

- **A mutação precisa ser determinística em relação a `(estado, agora)`.** Ela pode rodar mais de uma vez, então não pode gerar ids nem ter efeitos fora do `estado`. Ids e outros valores aleatórios são gerados antes da chamada.
- Toda a lógica de domínio fica em funções puras em `lib/dominio/` (`reservar`, `confirmarReserva`, `cancelarReserva`, `confirmarNumeros`, `desconfirmarNumeros`, `removerNumeros`, `editarPerfil`, `aplicarExpiracoes`). Elas são testáveis sem rede.
- Mensagem de commit: `[rifa] <acao> <idReserva> <numeros>`. Exemplo: `[rifa] reservado r_8f2k91ab0c 7,12`.

### 6.3 Leitura e cache

- `lerEstado({ fresco })` retorna uma **visão**: `structuredClone` do estado com `aplicarExpiracoes` aplicada em memória.
- Cache em memória no módulo, com TTL de **5 s**, usado apenas na grade pública (`GET /api/rifa`). Isso protege o limite de requisições quando muita gente está com a página aberta.
- O painel admin e `GET /api/reservas/[id]` usam `fresco: true`.
- Depois de uma escrita bem-sucedida, `invalidarCache()` limpa o cache da instância.

### 6.4 Inicialização

Script `scripts/seed.ts` (`npm run seed`):

- Lê as variáveis de ambiente.
- Se o arquivo já existir (GET 200), aborta com uma mensagem.
- Caso contrário, cria o `Estado` com a config padrão, todos os números `livre` e `reservas`/`eventos` vazios, e grava com `gravarArquivo(estado, null, "[rifa] inicialização")`.

A config pode ser ajustada depois editando o `rifa.json` direto no GitHub.

---

## 7. API

Formato padrão de erro:

```json
{
  "erro": {
    "codigo": "NUMEROS_INDISPONIVEIS",
    "mensagem": "…",
    "numeros": ["7"]
  }
}
```

| Código                   | HTTP | Quando                                                        |
| ------------------------ | ---- | ------------------------------------------------------------- |
| `DADOS_INVALIDOS`        | 400  | Corpo malformado, nome/telefone inválidos, número inexistente |
| `LIMITE_EXCEDIDO`        | 400  | Mais números que `maxPorReserva`                              |
| `NAO_AUTORIZADO`         | 401  | Rota admin sem sessão válida                                  |
| `RESERVA_NAO_ENCONTRADA` | 404  | Id inexistente                                                |
| `NUMEROS_INDISPONIVEIS`  | 409  | Algum número não está livre (traz `numeros`)                  |
| `RESERVA_NAO_ABERTA`     | 409  | Confirmar/cancelar uma reserva que não está `aberta`          |
| `TRANSICAO_INVALIDA`     | 409  | Ação do admin incompatível com o status                       |
| `RESERVA_EXPIRADA`       | 410  | Confirmação depois de `expiraEm + tolerância`                 |
| `CONFLITO_PERSISTENTE`   | 503  | Esgotou as tentativas de escrita                              |

### 7.1 Públicas

**`GET /api/rifa`** — dados da grade (com cache de 5 s). Nunca retorna nome nem telefone.

```json
{
  "config": {
    "titulo": "…",
    "descricao": "…",
    "valorPorNumeroCentavos": 1000,
    "primeiro": 1,
    "ultimo": 100,
    "minutosReserva": 10,
    "maxPorReserva": null,
    "instrucoesPagamento": "…"
  },
  "numeros": [
    { "numero": "1", "status": "livre" },
    { "numero": "7", "status": "pendente" }
  ]
}
```

**`POST /api/reservas`** — cria uma reserva.

- Corpo: `{ "numeros": ["7", "12"] }`
- 201: `{ "id": "r_…", "numeros": ["7", "12"], "segundosRestantes": 600 }`
- Erros: `DADOS_INVALIDOS`, `LIMITE_EXCEDIDO`, `NUMEROS_INDISPONIVEIS`.

**`GET /api/reservas/[id]`** — estado atual de uma reserva (leitura fresca).

- 200: `{ "id": "r_…", "status": "aberta", "numeros": ["7", "12"], "segundosRestantes": 312 }`
- `segundosRestantes = max(0, floor((expiraEm − agora) / 1000))`, sem a tolerância. Vale 0 quando não está `aberta`.

**`POST /api/reservas/[id]/confirmar`** — o comprador confirma a reserva.

- Corpo: `{ "nome": "Maria Souza", "telefone": "(21) 99999-8888" }`
- 200: `{ "id": "r_…", "status": "solicitada", "numeros": ["7", "12"] }`
- Erros: `RESERVA_NAO_ENCONTRADA`, `RESERVA_NAO_ABERTA`, `RESERVA_EXPIRADA`, `DADOS_INVALIDOS`.

**`DELETE /api/reservas/[id]`** — o comprador cancela uma reserva `aberta`.

- 200: `{ "id": "r_…", "status": "cancelada" }`
- Erros: `RESERVA_NAO_ENCONTRADA`, `RESERVA_NAO_ABERTA`.

### 7.2 Admin

Todas as rotas abaixo, exceto o login, chamam `exigirAdmin()` (seção 9) e respondem 401 sem sessão válida.

| Rota                                         | Corpo                                      | Efeito                                                     |
| -------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------- |
| `POST /api/admin/login`                      | `{ "senha": "…" }`                         | Valida a senha e grava o cookie de sessão                  |
| `POST /api/admin/logout`                     | —                                          | Apaga o cookie                                             |
| `GET /api/admin/estado`                      | —                                          | `Estado` completo (visão fresca, com expirações aplicadas) |
| `POST /api/admin/reservas/[id]/confirmar`    | `{ "numeros"?: string[] }`                 | `pendente` → `confirmado`                                  |
| `POST /api/admin/reservas/[id]/desconfirmar` | `{ "numeros"?: string[] }`                 | `confirmado` → `pendente`                                  |
| `POST /api/admin/reservas/[id]/remover`      | `{ "numeros"?: string[] }`                 | `pendente`/`confirmado` → `livre`                          |
| `PATCH /api/admin/reservas/[id]`             | `{ "nome"?: string, "telefone"?: string }` | Edita o perfil                                             |

As ações retornam a reserva atualizada junto com os números dela e seus status. Os históricos são montados no cliente a partir de `estado.eventos`, sem rota dedicada.

---

## 8. Interface

### 8.1 Página pública (`/`)

- Cabeçalho com `titulo`, `descricao` e o valor por número.
- **Grade 10×10.** Os números aparecem com pelo menos 2 dígitos (`01`…`100`). Cores por status, com legenda:
  - livre: clicável;
  - reservado: indisponível temporariamente;
  - pendente: indisponível;
  - confirmado: vendido.
- O comprador clica em números livres para selecioná-los, só no estado local. Uma barra fixa mostra "N números — R$ X,XX" e o botão **Reservar**.
- **Atualização da grade:** a cada 15 s e quando a aba volta ao foco.
- **Ao reservar:**
  - `POST /api/reservas`.
  - Em caso de sucesso, grava no `localStorage` a chave `rifa:reservaAtiva` = `{ id, numeros, prazo }`, com `prazo = Date.now() + segundosRestantes * 1000`.
  - Exibe o timer e o formulário de confirmação.
- **Em `NUMEROS_INDISPONIVEIS`:**
  - Mostra "Os números X, Y acabaram de ser reservados por outra pessoa".
  - Remove esses números da seleção e atualiza a grade.
- **Com reserva aberta:**
  - A grade fica somente leitura. Há uma reserva ativa por navegador.
  - O formulário pede nome e telefone, com máscara `(00) 00000-0000`.
  - Há o botão **Cancelar reserva**, que chama `DELETE`.
- **Ao confirmar com sucesso:**
  - Remove `rifa:reservaAtiva`.
  - Mostra a tela de sucesso: "Recebemos sua reserva dos números X, Y. Ela está pendente de confirmação pelo organizador.", seguida de `instrucoesPagamento`.
- **Em `RESERVA_EXPIRADA`:** limpa o `localStorage`, informa que o prazo acabou e atualiza a grade.
- **Ao carregar a página com `rifa:reservaAtiva`:**
  - Chama `GET /api/reservas/[id]`.
  - Se a reserva estiver `aberta` e com `segundosRestantes > 0`, recalcula o `prazo` e retoma o timer e o formulário.
  - Caso contrário, remove a chave.

### 8.2 Timer

A contagem é sempre `prazo − Date.now()`, nunca um contador decrementado. Assim ela sobrevive a um recarregamento e não acumula desvio. O `prazo` é calculado a partir dos `segundosRestantes` do servidor, o que elimina a diferença entre o relógio do aparelho e o do servidor.

```tsx
"use client";
import { useEffect, useState } from "react";

type Props = { numeros: string[]; prazo: number; onExpirar: () => void };

export function TimerReserva({ numeros, prazo, onExpirar }: Props) {
  const [restante, setRestante] = useState(() => prazo - Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      const r = prazo - Date.now();
      setRestante(r);
      if (r <= 0) {
        clearInterval(id);
        onExpirar();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [prazo, onExpirar]);

  if (restante <= 0) return null;
  const min = Math.floor(restante / 60000);
  const seg = String(Math.floor((restante % 60000) / 1000)).padStart(2, "0");

  return (
    <p>
      Você reservou os números {numeros.join(", ")} e tem {min}:{seg} para
      confirmar.
    </p>
  );
}
```

- O `onExpirar` deve ser estável (`useCallback`). Ele limpa o `localStorage`, mostra "Sua reserva expirou" e atualiza a grade.
- A decisão final é sempre do servidor. O timer é apenas informativo.

### 8.3 Painel admin (`/admin`)

**Login (`/admin/login`):** campo de senha. Em caso de sucesso, redireciona para `/admin`.

**Visão geral (`/admin`):**

- **Resumo:** contagem de livres, reservados, pendentes e confirmados, além do valor pendente e do valor confirmado (quantidade × `valorPorNumeroCentavos`).
- **Pendentes de confirmação:**
  - Lista as reservas `solicitada` com pelo menos um número `pendente`, das mais antigas para as mais novas.
  - Cada card mostra:
    - nome;
    - telefone formatado, com link `https://wa.me/55{telefone}`;
    - números pendentes;
    - valor;
    - "solicitada há X min".
  - Ações do card: **Confirmar todos**, **Remover todos**, **Editar perfil** e **Detalhes**.
- **Grade admin:** igual à pública, mas cada número mostra o nome do comprador ao passar o mouse ou tocar. Ao clicar, abre o histórico do número.
- **Histórico geral:** todos os eventos, dos mais recentes para os mais antigos, com filtro por ação.

**Detalhe da reserva (`/admin/reservas/[id]`):**

- Perfil (nome e telefone) editável, com botão **Salvar**.
- Lista de números da reserva com o status e as ações individuais que se aplicam:
  - `pendente`: confirmar e remover;
  - `confirmado`: desconfirmar e remover.
- Linha do tempo com os eventos dessa reserva.

**Histórico do número** (modal ou `/admin/numeros/[n]`): eventos cujo `numeros` contém o número, em ordem cronológica (ordenados por `em`).

**Descrição dos eventos na interface:**

| Ação             | Texto                                                               |
| ---------------- | ------------------------------------------------------------------- |
| `reservado`      | Reservado (reserva r\_…)                                            |
| `solicitado`     | Reserva confirmada por {nome} — {telefone} — aguardando confirmação |
| `cancelado`      | Reserva cancelada pelo comprador — liberado                         |
| `expirado`       | Reserva expirou sem confirmação — liberado                          |
| `confirmado`     | Confirmado pelo admin ({nome})                                      |
| `desconfirmado`  | Confirmação desfeita pelo admin ({nome}) — voltou a pendente        |
| `removido`       | Atribuição removida pelo admin ({nome}) — liberado                  |
| `perfil_editado` | Perfil corrigido: {campo} "{de}" → "{para}"                         |

Ações destrutivas (remover, desconfirmar) pedem confirmação num diálogo.

---

## 9. Autenticação do admin

- **Login:** compara a senha com `ADMIN_PASSWORD` usando uma comparação de tempo constante.
- **Cookie `admin_session`:**
  - valor `${expiraEmUnix}.${hmacSha256(expiraEmUnix, ADMIN_SESSION_SECRET)}`;
  - `httpOnly`, `secure`, `sameSite=lax`, `path=/`;
  - validade de 7 dias.
- **`exigirAdmin()`** em `lib/auth.ts` lê o cookie, valida a assinatura e a validade, e lança `NAO_AUTORIZADO` se algo falhar. Ela é chamada:
  - em todo Route Handler de `/api/admin/*`, exceto o login;
  - no `layout.tsx` de `/admin` (Server Component), que redireciona para `/admin/login`.
- Use Web Crypto (`crypto.subtle`) para o HMAC, para funcionar em qualquer runtime.

---

## 10. Limites operacionais

- **Limites do GitHub:** cerca de 5.000 requisições por hora com token. Para escritas, o limite secundário é de 80 por minuto e 500 por hora. Cada escrita é um commit.
- **Volume esperado:**
  - cada compra gera 2 escritas (reservar e confirmar);
  - cada ação do admin gera 1 escrita;
  - as expirações não geram escritas próprias, porque vão junto com a próxima.
- **Estimativa:** algumas centenas de commits ao longo da rifa inteira. O risco só aparece com mais de ~40 reservas por minuto.
- **Leituras:** o cache de 5 s da grade pública mantém o volume baixo mesmo com polling.
- **Tamanho:** o arquivo fica na casa de dezenas de KB, muito abaixo de 1 MB.
- **Latência:** cada operação leva algumas centenas de ms. Mostre o estado de carregamento nos botões.
- **Backup e auditoria:** o histórico de commits do repositório. Qualquer versão anterior pode ser restaurada pelo GitHub.

---

## 11. Estrutura de pastas

```
app/
  page.tsx                                   # grade pública + fluxo de reserva
  admin/
    layout.tsx                               # exigirAdmin + redirect
    login/page.tsx
    page.tsx                                 # resumo, pendentes, grade, histórico geral
    reservas/[id]/page.tsx
  api/
    rifa/route.ts                            # GET
    reservas/route.ts                        # POST
    reservas/[id]/route.ts                   # GET, DELETE
    reservas/[id]/confirmar/route.ts         # POST
    admin/login/route.ts                     # POST
    admin/logout/route.ts                    # POST
    admin/estado/route.ts                    # GET
    admin/reservas/[id]/route.ts             # PATCH
    admin/reservas/[id]/[acao]/route.ts      # POST confirmar|desconfirmar|remover
components/
  GradeNumeros.tsx
  TimerReserva.tsx
  FormConfirmacao.tsx
lib/
  github.ts                                  # lerArquivo, gravarArquivo
  db.ts                                      # lerEstado (cache), atualizar (CAS)
  auth.ts                                    # login, exigirAdmin
  erros.ts                                   # ErroDominio + resposta padrão
  formatar.ts                                # telefone, número, moeda, data
  dominio/
    tipos.ts
    validacao.ts
    expiracao.ts                             # aplicarExpiracoes
    reservas.ts                              # reservar, confirmarReserva, cancelarReserva
    admin.ts                                 # confirmarNumeros, desconfirmarNumeros, removerNumeros, editarPerfil
    historico.ts                             # filtros e descrições de eventos
scripts/
  seed.ts
```

---

## 12. Critérios de aceite

1. Com o arquivo inicializado, a grade pública mostra os 100 números livres e nenhuma resposta pública contém nome ou telefone.
2. Duas requisições simultâneas reservando o número 7 resultam em exatamente um 201 e um 409 `NUMEROS_INDISPONIVEIS` com `["7"]`. O arquivo final tem o 7 em uma única reserva.
3. Uma reserva de `["7", "12"]` em que o 12 já está ocupado falha por inteiro. O 7 continua livre.
4. Depois de reservar, o timer mostra "Você reservou os números 7, 12 e tem 9:59 para confirmar" e decrementa. Ao recarregar a página, ele continua do tempo correto.
5. Com o prazo vencido, a confirmação retorna 410 `RESERVA_EXPIRADA`. Se ela chegar até 30 s depois de `expiraEm`, é aceita.
6. Uma reserva vencida aparece como livre na grade sem nenhuma escrita. Na próxima escrita, o commit inclui o evento `expirado` e a reserva fica `expirada`.
7. A confirmação válida leva os números a `pendente` e a reserva a `solicitada`, grava nome e telefone normalizados e registra o evento `solicitado` com o snapshot.
8. Cancelar uma reserva aberta libera os números e registra `cancelado`. Cancelar uma reserva `solicitada` retorna 409.
9. O admin sem cookie recebe 401 nas rotas `/api/admin/*` e é redirecionado em `/admin`.
10. Editar o perfil grava `perfil_editado` com `de`/`para`. Os eventos anteriores continuam mostrando o nome antigo, e os posteriores, o novo.
11. **Cenário do histórico.** O histórico do número 7 mostra, nesta ordem:
    1. reservado (A);
    2. reserva confirmada por A;
    3. atribuição removida pelo admin (A);
    4. reservado (B);
    5. reserva confirmada por B;
    6. confirmado pelo admin (B);
    7. confirmação desfeita (B);
    8. atribuição removida (B).

    Ao final, o número 7 está `livre`.

12. Cada operação bem-sucedida gera exatamente um commit no repositório com a mensagem no formato `[rifa] <acao> <reserva> <numeros>`.
13. As funções de `lib/dominio/` têm testes unitários (ex.: Vitest) cobrindo todas as transições válidas e inválidas da seção 5.1.
