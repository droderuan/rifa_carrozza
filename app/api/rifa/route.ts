import { lerEstado } from "@/lib/db";
import { visaoPublica } from "@/lib/dominio/publico";
import { rota } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = rota(async () => Response.json(visaoPublica(await lerEstado())));
