import { exigirAdmin } from "@/lib/auth";
import { lerEstado } from "@/lib/db";
import { rota } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = rota(async () => {
  await exigirAdmin();
  return Response.json(await lerEstado({ fresco: true }));
});
