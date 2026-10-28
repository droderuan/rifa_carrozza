import { criarEstadoInicial } from "@/lib/dominio/estado-inicial";
import type { Estado } from "@/lib/dominio/tipos";
import { gravarArquivo, lerArquivo } from "@/lib/github";

export interface Armazenamento {
  ler(): Promise<{ estado: Estado; sha: string }>;
  gravar(estado: Estado, sha: string | null, mensagem: string): Promise<"ok" | "conflito">;
}

/** Armazenamento em memória: usado nos testes e em `next dev` sem GITHUB_TOKEN. */
export function criarArmazenamentoMemoria(inicial: Estado = criarEstadoInicial()) {
  let estado = structuredClone(inicial);
  let versao = 1;
  const commits: string[] = [];
  return {
    commits,
    async ler() {
      return { estado: structuredClone(estado), sha: String(versao) };
    },
    async gravar(novo: Estado, sha: string | null, mensagem: string) {
      if (sha !== String(versao)) return "conflito" as const;
      estado = structuredClone(novo);
      versao++;
      commits.push(mensagem);
      return "ok" as const;
    },
  } satisfies Armazenamento & { commits: string[] };
}

const github: Armazenamento = { ler: lerArquivo, gravar: gravarArquivo };

let override: Armazenamento | null = null;

export function definirArmazenamento(a: Armazenamento | null): void {
  override = a;
}

export function obterArmazenamento(): Armazenamento {
  if (override) return override;
  if (process.env.GITHUB_TOKEN) return github;
  if (process.env.NODE_ENV !== "production") {
    const g = globalThis as { __rifaMemoria?: Armazenamento };
    if (!g.__rifaMemoria) {
      console.warn("[rifa] GITHUB_TOKEN ausente: usando armazenamento em memória (só desenvolvimento).");
      g.__rifaMemoria = criarArmazenamentoMemoria();
    }
    return g.__rifaMemoria;
  }
  throw new Error("GITHUB_TOKEN não configurado.");
}
