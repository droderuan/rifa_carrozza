import { cookies } from "next/headers";
import { COOKIE_SESSAO, exigirAdmin } from "@/lib/auth";
import { rota } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = rota(async () => {
  await exigirAdmin();
  (await cookies()).delete(COOKIE_SESSAO);
  return Response.json({ ok: true });
});
