import { exigirAdmin } from "@/lib/auth";
import { atualizar } from "@/lib/db";
import { editarConfig } from "@/lib/dominio/config";
import { lerCorpo, rota } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PATCH = rota(async (req: Request) => {
  await exigirAdmin();
  const corpo = await lerCorpo(req);
  const estado = await atualizar("[rifa] config_editada", (e) => editarConfig(e, corpo));
  return Response.json({ config: estado.config });
});
