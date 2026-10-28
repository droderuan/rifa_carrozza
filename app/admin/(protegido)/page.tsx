import { exigirPaginaAdmin } from "@/lib/auth";
import { CardPendente } from "@/components/admin/CardPendente";
import { GradeAdmin } from "@/components/admin/GradeAdmin";
import { HistoricoGeral } from "@/components/admin/HistoricoGeral";
import { Resumo } from "@/components/admin/Resumo";
import { lerEstado } from "@/lib/db";
import { visaoPublica } from "@/lib/dominio/publico";
import { numerosDaReserva } from "@/lib/dominio/reservas";
import { minutosDesde } from "@/lib/formatar";

export default async function PainelAdmin() {
  await exigirPaginaAdmin();
  const estado = await lerEstado({ fresco: true });
  const agora = new Date();

  const pendentes = Object.values(estado.reservas)
    .filter((r) => r.status === "solicitada")
    .map((r) => ({ reserva: r, pendentes: numerosDaReserva(estado, r.id).filter((n) => estado.numeros[n].status === "pendente") }))
    .filter((p) => p.pendentes.length > 0)
    .sort((a, b) => (a.reserva.solicitadaEm ?? "").localeCompare(b.reserva.solicitadaEm ?? ""));

  const donos: Record<string, string> = {};
  for (const [n, num] of Object.entries(estado.numeros)) {
    if (!num.reserva) continue;
    const r = estado.reservas[num.reserva];
    donos[n] = r?.nome ?? "Reserva aberta (sem nome ainda)";
  }

  return (
    <>
      <Resumo estado={estado} />

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold">Pendentes de confirmação</h2>
        {pendentes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma reserva aguardando confirmação.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {pendentes.map(({ reserva, pendentes }) => (
              <CardPendente
                key={reserva.id}
                reserva={reserva}
                pendentes={pendentes}
                valorPorNumeroCentavos={estado.config.valorPorNumeroCentavos}
                minutos={minutosDesde(reserva.solicitadaEm ?? reserva.criadaEm, agora)}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold">Grade</h2>
        <div className="max-w-xl">
          <GradeAdmin numeros={visaoPublica(estado).numeros} donos={donos} eventos={estado.eventos} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold">Histórico geral</h2>
        <HistoricoGeral eventos={estado.eventos} />
      </section>
    </>
  );
}
