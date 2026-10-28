import { cookies } from "next/headers";
import { COOKIE_SESSAO, criarValorSessao, opcoesCookie, senhaConfere } from "@/lib/auth";
import { ErroDominio } from "@/lib/erros";
import { lerCorpo, rota } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = rota(async (req: Request) => {
  const { senha } = await lerCorpo(req);
  const ok = await senhaConfere(typeof senha === "string" ? senha : "", process.env.ADMIN_PASSWORD ?? "");
  if (!ok) throw new ErroDominio("NAO_AUTORIZADO", 401, "Senha incorreta.");
  const segredo = process.env.ADMIN_SESSION_SECRET;
  if (!segredo) throw new Error("ADMIN_SESSION_SECRET não configurado.");
  (await cookies()).set(COOKIE_SESSAO, await criarValorSessao(Date.now(), segredo), opcoesCookie());
  return Response.json({ ok: true });
});
