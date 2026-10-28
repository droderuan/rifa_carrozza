import { ErroDominio, respostaErro } from "@/lib/erros";

/** Lê o corpo JSON como objeto. Corpo vazio vale `{}`. */
export async function lerCorpo(req: Request): Promise<Record<string, unknown>> {
  const texto = await req.text();
  if (texto.trim() === "") return {};
  let dados: unknown;
  try {
    dados = JSON.parse(texto);
  } catch {
    throw new ErroDominio("DADOS_INVALIDOS", 400, "Corpo da requisição inválido.");
  }
  if (typeof dados !== "object" || dados === null || Array.isArray(dados)) {
    throw new ErroDominio("DADOS_INVALIDOS", 400, "Corpo da requisição inválido.");
  }
  return dados as Record<string, unknown>;
}

/** Envolve um Route Handler convertendo erros no formato padrão da API. */
export function rota<C>(handler: (req: Request, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C): Promise<Response> => {
    try {
      return await handler(req, ctx);
    } catch (e) {
      return respostaErro(e);
    }
  };
}
