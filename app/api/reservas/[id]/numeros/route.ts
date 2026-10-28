import { atualizar, mensagemCommit } from "@/lib/db";
import { adicionarNumeros, numerosDaReserva, segundosRestantes } from "@/lib/dominio/reservas";
import { lerCorpo, rota } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = rota(async (req: Request, ctx: RouteContext<"/api/reservas/[id]/numeros">) => {
  const { id } = await ctx.params;
  const { numeros } = await lerCorpo(req);
  const estado = await atualizar(mensagemCommit, (e, agora) => adicionarNumeros(e, agora, id, numeros));
  const r = estado.reservas[id];
  return Response.json({
    id,
    status: r.status,
    numeros: numerosDaReserva(estado, id),
    segundosRestantes: segundosRestantes(r, new Date()),
  });
});
