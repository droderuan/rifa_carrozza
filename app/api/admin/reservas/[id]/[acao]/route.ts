import { exigirAdmin } from "@/lib/auth";
import { atualizar, mensagemCommit } from "@/lib/db";
import { ACOES_ADMIN, type AcaoAdmin } from "@/lib/dominio/admin";
import { reservaComNumeros } from "@/lib/dominio/reservas";
import { lerCorpo, rota } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = rota(async (req: Request, ctx: RouteContext<"/api/admin/reservas/[id]/[acao]">) => {
  await exigirAdmin();
  const { id, acao } = await ctx.params;
  if (!Object.hasOwn(ACOES_ADMIN, acao)) {
    return Response.json({ erro: { codigo: "DADOS_INVALIDOS", mensagem: "Ação desconhecida." } }, { status: 404 });
  }
  const executar = ACOES_ADMIN[acao as AcaoAdmin];
  const { numeros } = await lerCorpo(req);
  const estado = await atualizar(mensagemCommit, (e, agora) => executar(e, agora, id, numeros));
  return Response.json(reservaComNumeros(estado, id));
});
