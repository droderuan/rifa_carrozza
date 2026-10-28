import type { Estado } from "@/lib/dominio/tipos";
import { ErroDominio } from "@/lib/erros";

const API = "https://api.github.com";

const caminho = () => process.env.GITHUB_DB_PATH || "rifa.json";
const urlRepo = () => `${API}/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}`;
const urlArquivo = () => `${urlRepo()}/contents/${caminho()}`;

function headers() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "rifa-carrozza",
  };
}

/** Branch só de dados (ex.: dados-producao, dados-teste). Obrigatório: nunca grava no branch do código por engano. */
function branch(): string {
  const b = process.env.GITHUB_BRANCH;
  if (!b) throw new Error("GITHUB_BRANCH não configurado (ex.: dados-teste ou dados-producao).");
  return b;
}

function json(dados: unknown) {
  return JSON.stringify(dados, null, 2);
}

export function codificar(estado: Estado): string {
  return Buffer.from(json(estado), "utf8").toString("base64");
}

export function decodificar(base64: string): Estado {
  return JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
}

async function buscar(): Promise<Response> {
  return fetch(`${urlArquivo()}?ref=${branch()}`, { headers: headers(), cache: "no-store" });
}

export async function arquivoExiste(): Promise<boolean> {
  const res = await buscar();
  if (res.status === 404) return false;
  if (!res.ok) throw new Error(`GitHub GET ${res.status}: ${await res.text()}`);
  return true;
}

export async function lerArquivo(): Promise<{ estado: Estado; sha: string }> {
  const res = await buscar();
  if (res.status === 404) {
    throw new ErroDominio("RIFA_NAO_INICIALIZADA", 503, "Rifa ainda não inicializada.");
  }
  if (!res.ok) throw new Error(`GitHub GET ${res.status}: ${await res.text()}`);
  const corpo = await res.json();
  if (corpo.encoding === "base64") return { estado: decodificar(corpo.content), sha: corpo.sha };
  // Acima de 1 MB a Contents API não traz o conteúdo; lê o blob desse mesmo sha em formato raw.
  const blob = await fetch(
    `${urlRepo()}/git/blobs/${corpo.sha}`,
    { headers: { ...headers(), Accept: "application/vnd.github.raw+json" }, cache: "no-store" },
  );
  if (!blob.ok) throw new Error(`GitHub GET blob ${blob.status}: ${await blob.text()}`);
  return { estado: JSON.parse(await blob.text()), sha: corpo.sha };
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
      content: codificar(estado),
      branch: branch(),
      ...(sha ? { sha } : {}),
    }),
  });
  if (res.ok) return "ok";
  const texto = await res.text();
  if (res.status === 409 || (res.status === 422 && texto.includes("sha"))) return "conflito";
  throw new Error(`GitHub PUT ${res.status}: ${texto}`);
}

async function postar<T>(rota: string, corpo: unknown): Promise<T> {
  const res = await fetch(`${urlRepo()}${rota}`, { method: "POST", headers: headers(), body: JSON.stringify(corpo) });
  if (!res.ok) throw new Error(`GitHub POST ${rota} ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function branchExiste(): Promise<boolean> {
  const res = await fetch(`${urlRepo()}/git/ref/heads/${branch()}`, { headers: headers(), cache: "no-store" });
  if (res.status === 404) return false;
  if (!res.ok) throw new Error(`GitHub GET ref ${res.status}: ${await res.text()}`);
  return true;
}

/**
 * Cria os dados da rifa no branch configurado. Se o branch não existir, ele nasce órfão
 * (sem o código, só com o rifa.json). Nunca sobrescreve um arquivo existente.
 */
export async function inicializarDados(
  estado: Estado,
  mensagem: string,
): Promise<"branch-criado" | "arquivo-criado" | "ja-existe"> {
  if (!(await branchExiste())) {
    const tree = await postar<{ sha: string }>("/git/trees", {
      tree: [{ path: caminho(), mode: "100644", type: "blob", content: json(estado) }],
    });
    const commit = await postar<{ sha: string }>("/git/commits", { message: mensagem, tree: tree.sha, parents: [] });
    await postar("/git/refs", { ref: `refs/heads/${branch()}`, sha: commit.sha });
    return "branch-criado";
  }
  if (await arquivoExiste()) return "ja-existe";
  if ((await gravarArquivo(estado, null, mensagem)) !== "ok") throw new Error("Conflito ao criar o arquivo.");
  return "arquivo-criado";
}
