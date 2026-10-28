import { exigirAdmin } from "@/lib/auth";
import { atualizar, mensagemCommit } from "@/lib/db";
import { editarPerfil } from "@/lib/dominio/admin";
import { reservaComNumeros } from "@/lib/dominio/reservas";
import { lerCorpo, rota } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PATCH = rota(async (req: Request, ctx: RouteContext<"/api/admin/reservas/[id]">) => {
  await exigirAdmin();
  const { id } = await ctx.params;
  const corpo = await lerCorpo(req);
  const estado = await atualizar(mensagemCommit, (e, agora) =>
    editarPerfil(e, agora, id, { nome: corpo.nome, telefone: corpo.telefone }),
  );
  return Response.json(reservaComNumeros(estado, id));
});
