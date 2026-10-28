import { atualizar, lerEstado, mensagemCommit } from "@/lib/db";
import { cancelarReserva, numerosDaReserva, obterReserva, segundosRestantes } from "@/lib/dominio/reservas";
import { rota } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = rota(async (_req: Request, ctx: RouteContext<"/api/reservas/[id]">) => {
  const { id } = await ctx.params;
  const estado = await lerEstado({ fresco: true });
  const r = obterReserva(estado, id);
  return Response.json({
    id,
    status: r.status,
    numeros: numerosDaReserva(estado, id),
    segundosRestantes: segundosRestantes(r, new Date()),
  });
});

export const DELETE = rota(async (_req: Request, ctx: RouteContext<"/api/reservas/[id]">) => {
  const { id } = await ctx.params;
  await atualizar(mensagemCommit, (e, agora) => cancelarReserva(e, agora, id));
  return Response.json({ id, status: "cancelada" });
});
