import { ExternalLinkIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { AcoesNumero } from "@/components/admin/AcoesNumero";
import { FormPerfil } from "@/components/admin/FormPerfil";
import { ListaEventos } from "@/components/admin/ListaEventos";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exigirPaginaAdmin } from "@/lib/auth";
import { lerEstado } from "@/lib/db";
import { eventosDaReserva } from "@/lib/dominio/historico";
import { reservaComNumeros } from "@/lib/dominio/reservas";
import type { StatusNumero, StatusReserva } from "@/lib/dominio/tipos";
import { formatarDataHora, formatarNumero, formatarTelefone, linkWhatsApp } from "@/lib/formatar";
import { cn } from "@/lib/utils";

const ROTULO_NUMERO: Record<StatusNumero, string> = {
  livre: "Livre",
  reservado: "Reservado",
  pendente: "Pendente",
  confirmado: "Confirmado",
};

const ROTULO_RESERVA: Record<StatusReserva, string> = {
  aberta: "Aberta",
  solicitada: "Solicitada",
  expirada: "Expirada",
  cancelada: "Cancelada",
};

export default async function DetalheReserva({ params }: PageProps<"/admin/reservas/[id]">) {
  const { id } = await params;
  await exigirPaginaAdmin();
  const estado = await lerEstado({ fresco: true });
  if (!estado.reservas[id]) notFound();
  const { reserva, numeros } = reservaComNumeros(estado, id);

  return (
    <>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Reserva {reserva.id}</p>
        <h1 className="flex flex-wrap items-center gap-2 font-display text-2xl font-bold">
          {reserva.nome ?? "Sem nome"}
          <Badge variant="outline">{ROTULO_RESERVA[reserva.status]}</Badge>
        </h1>
        <p className="text-sm text-muted-foreground">
          Criada em {formatarDataHora(reserva.criadaEm)}
          {reserva.solicitadaEm && ` · solicitada em ${formatarDataHora(reserva.solicitadaEm)}`}
        </p>
        {reserva.telefone && (
          <a
            href={linkWhatsApp(reserva.telefone)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
          >
            {formatarTelefone(reserva.telefone)}
            <ExternalLinkIcon className="size-3.5" />
          </a>
        )}
      </div>

      {reserva.status === "solicitada" && (
        <section className="max-w-md space-y-3 rounded-xl border bg-card p-4">
          <h2 className="font-display text-lg font-bold">Perfil</h2>
          <FormPerfil id={reserva.id} nome={reserva.nome ?? ""} telefone={reserva.telefone ?? ""} />
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">Números</h2>
        {numeros.length === 0 ? (
          <p className="text-sm text-muted-foreground">Esta reserva não tem mais números.</p>
        ) : (
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {numeros.map((n) => (
                  <TableRow key={n.numero}>
                    <TableCell className="font-semibold tabular-nums">{formatarNumero(n.numero)}</TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          n.status === "pendente" && "bg-pendente text-pendente-texto",
                          n.status === "confirmado" && "bg-primary text-primary-foreground",
                          n.status === "reservado" && "bg-reservado text-reservado-texto",
                        )}
                      >
                        {ROTULO_NUMERO[n.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <AcoesNumero id={reserva.id} numero={n.numero} status={n.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">Linha do tempo</h2>
        <ListaEventos eventos={eventosDaReserva(estado.eventos, reserva.id)} />
      </section>
    </>
  );
}
