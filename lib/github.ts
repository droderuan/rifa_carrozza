import type { Estado } from "@/lib/dominio/tipos";
import { ErroDominio } from "@/lib/erros";

const API = "https://api.github.com";

function urlArquivo() {
  const path = process.env.GITHUB_DB_PATH || "rifa.json";
  return `${API}/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${path}`;
}

function headers() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "rifa-carrozza",
  };
}

const branch = () => process.env.GITHUB_BRANCH || "main";

export function codificar(estado: Estado): string {
  return Buffer.from(JSON.stringify(estado, null, 2), "utf8").toString("base64");
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
  const json = await res.json();
  return { estado: decodificar(json.content), sha: json.sha };
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
