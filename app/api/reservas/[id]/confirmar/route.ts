import { atualizar, mensagemCommit } from "@/lib/db";
import { confirmarReserva, numerosDaReserva } from "@/lib/dominio/reservas";
import { lerCorpo, rota } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = rota(async (req: Request, ctx: RouteContext<"/api/reservas/[id]/confirmar">) => {
  const { id } = await ctx.params;
  const corpo = await lerCorpo(req);
  const estado = await atualizar(mensagemCommit, (e, agora) =>
    confirmarReserva(e, agora, id, { nome: corpo.nome, telefone: corpo.telefone }),
  );
  return Response.json({ id, status: "solicitada", numeros: numerosDaReserva(estado, id) });
});
