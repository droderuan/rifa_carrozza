import { atualizar, lerEstado, mensagemCommit } from "@/lib/db";
import { gerarIdReserva, numerosDaReserva, reservar, segundosRestantes } from "@/lib/dominio/reservas";
import { lerCorpo, rota } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

class IdEmUso extends Error {}

export const POST = rota(async (req: Request) => {
  const corpo = await lerCorpo(req);
  const existentes = (await lerEstado()).reservas;
  for (let tentativa = 0; ; tentativa++) {
    // O id é gerado fora da mutação, que pode rodar mais de uma vez.
    const id = gerarIdReserva(existentes);
    try {
      const estado = await atualizar(mensagemCommit, (e, agora) => {
        if (e.reservas[id]) throw new IdEmUso();
        reservar(e, agora, id, corpo.numeros);
      });
      return Response.json(
        {
          id,
          numeros: numerosDaReserva(estado, id),
          segundosRestantes: segundosRestantes(estado.reservas[id], new Date()),
        },
        { status: 201 },
      );
    } catch (err) {
      if (err instanceof IdEmUso && tentativa < 2) continue;
      throw err;
    }
  }
});
