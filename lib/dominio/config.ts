import type { Config, DadosPix, Estado } from "@/lib/dominio/tipos";
import { ErroDominio } from "@/lib/erros";
import { REGEX_INSTAGRAM } from "@/lib/instagram";

export type DadosConfig = Partial<
  Pick<Config, "titulo" | "subtitulo" | "historia" | "instagramUrl" | "instrucoesPagamento">
> & { pix?: Partial<DadosPix> };

type CampoTexto = "titulo" | "subtitulo" | "historia" | "instrucoesPagamento";

const LIMITES: Record<CampoTexto, { min: number; max: number; rotulo: string }> = {
  titulo: { min: 2, max: 80, rotulo: "O título" },
  subtitulo: { min: 0, max: 160, rotulo: "O subtítulo" },
  historia: { min: 0, max: 4000, rotulo: "O texto" },
  instrucoesPagamento: { min: 0, max: 2000, rotulo: "As instruções de pagamento" },
};

const CAMPOS_EDITAVEIS = new Set<string>([...Object.keys(LIMITES), "instagramUrl", "pix"]);
const CAMPOS_PIX = ["chave", "titular", "banco"] as const;

function invalido(mensagem: string): never {
  throw new ErroDominio("DADOS_INVALIDOS", 400, mensagem);
}

function texto(v: unknown, campo: string): string {
  if (typeof v !== "string") invalido(`Campo ${campo} inválido.`);
  return v.trim();
}

/** Edita os textos da página e os dados do PIX. Retorna false se nada mudou. Não gera evento. */
export function editarConfig(estado: Estado, dados: unknown): boolean {
  if (typeof dados !== "object" || dados === null || Array.isArray(dados)) invalido("Dados inválidos.");
  const entrada = dados as Record<string, unknown>;
  const naoEditaveis = Object.keys(entrada).filter((k) => !CAMPOS_EDITAVEIS.has(k));
  if (naoEditaveis.length) invalido(`Campos não editáveis pelo painel: ${naoEditaveis.join(", ")}.`);

  const novo: Config = structuredClone(estado.config);

  for (const campo of Object.keys(LIMITES) as CampoTexto[]) {
    if (!(campo in entrada)) continue;
    const v = texto(entrada[campo], campo);
    const { min, max, rotulo } = LIMITES[campo];
    if (v.length < min || v.length > max) {
      invalido(min > 0 ? `${rotulo} precisa ter entre ${min} e ${max} caracteres.` : `${rotulo} pode ter até ${max} caracteres.`);
    }
    novo[campo] = v;
  }

  if ("instagramUrl" in entrada) {
    const v = texto(entrada.instagramUrl, "instagramUrl");
    if (v === "") delete novo.instagramUrl;
    else if (!REGEX_INSTAGRAM.test(v)) invalido("Link do Instagram inválido. Use o link de um post ou reel.");
    else novo.instagramUrl = v;
  }

  if ("pix" in entrada) {
    const pix = entrada.pix;
    if (typeof pix !== "object" || pix === null || Array.isArray(pix)) invalido("Dados do PIX inválidos.");
    const parcial = pix as Record<string, unknown>;
    const mesclado = { ...(novo.pix ?? { chave: "", titular: "", banco: "" }) };
    for (const k of CAMPOS_PIX) {
      if (k in parcial) mesclado[k] = texto(parcial[k], `pix.${k}`);
    }
    if (CAMPOS_PIX.some((k) => mesclado[k] === "")) invalido("Chave, titular e banco do PIX são obrigatórios.");
    novo.pix = mesclado;
  }

  if (JSON.stringify(novo) === JSON.stringify(estado.config)) return false;
  estado.config = novo;
  return true;
}
