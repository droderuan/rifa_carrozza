"use client";
import { AlertCircleIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FormConfirmacao } from "@/components/FormConfirmacao";
import { GradeNumeros, LegendaGrade } from "@/components/GradeNumeros";
import { BarraReserva } from "@/components/publico/BarraReserva";
import { TelaSucesso } from "@/components/publico/TelaSucesso";
import { TimerReserva } from "@/components/TimerReserva";
import * as api from "@/lib/cliente/api";
import { ErroApi } from "@/lib/cliente/api";
import {
  lerReservaAtiva,
  limparReservaAtiva,
  salvarReservaAtiva,
  type ReservaAtiva,
} from "@/lib/cliente/reserva-ativa";
import type { NumeroPublico } from "@/lib/dominio/publico";
import type { Config } from "@/lib/dominio/tipos";
import { formatarMoeda } from "@/lib/formatar";

const INTERVALO_ATUALIZACAO_MS = 5_000;

type Props = { config: Config; numerosIniciais: NumeroPublico[] };

const storage = () => window.localStorage;
const ordenar = (ns: string[]) => [...ns].sort((a, b) => Number(a) - Number(b));

function mensagemIndisponiveis(numeros: string[]) {
  return numeros.length === 1
    ? `O número ${numeros[0]} acabou de ser reservado por outra pessoa.`
    : `Os números ${numeros.join(", ")} acabaram de ser reservados por outra pessoa.`;
}

export function SecaoReserva({ config: configInicial, numerosIniciais }: Props) {
  const [config, setConfig] = useState(configInicial);
  const [numeros, setNumeros] = useState(numerosIniciais);
  const [reserva, setReservaEstado] = useState<ReservaAtiva | null>(null);
  const [sucesso, setSucesso] = useState<string[] | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pendentes, setPendentes] = useState<Set<string>>(new Set());
  const [ocupado, setOcupado] = useState<"confirmar" | "cancelar" | null>(null);
  // Espelho síncrono da reserva: as ações enfileiradas precisam do valor mais recente.
  const reservaRef = useRef<ReservaAtiva | null>(null);
  const filaRef = useRef<Promise<void>>(Promise.resolve());
  const formRef = useRef<HTMLDivElement>(null);
  const sucessoRef = useRef<HTMLDivElement>(null);

  const definirReserva = useCallback((r: ReservaAtiva | null) => {
    reservaRef.current = r;
    setReservaEstado(r);
    if (r) salvarReservaAtiva(storage(), r);
    else limparReservaAtiva(storage());
  }, []);

  const atualizarGrade = useCallback(async () => {
    try {
      const v = await api.obterRifa();
      setNumeros(v.numeros);
      setConfig(v.config);
    } catch {
      // Falha momentânea de rede: a próxima atualização tenta de novo.
    }
  }, []);

  // Atualiza a grade a cada 5 s com a aba visível, e na hora em que ela volta ao foco.
  useEffect(() => {
    const id = setInterval(() => document.visibilityState === "visible" && atualizarGrade(), INTERVALO_ATUALIZACAO_MS);
    const aoVoltar = () => document.visibilityState === "visible" && atualizarGrade();
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("focus", aoVoltar);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("focus", aoVoltar);
    };
  }, [atualizarGrade]);

  // Retoma a reserva aberta deste navegador.
  useEffect(() => {
    const salva = lerReservaAtiva(storage());
    if (!salva) return;
    api
      .obterReserva(salva.id)
      .then((r) => {
        if (r.status === "aberta" && r.segundosRestantes > 0 && r.numeros.length > 0) {
          definirReserva({ id: r.id, numeros: r.numeros, prazo: Date.now() + r.segundosRestantes * 1000 });
        } else {
          definirReserva(null);
        }
      })
      .catch((e) => {
        if (e instanceof ErroApi && e.codigo === "RESERVA_NAO_ENCONTRADA") definirReserva(null);
      });
  }, [definirReserva]);

  useEffect(() => {
    if (sucesso) sucessoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [sucesso]);

  const encerrarReserva = useCallback(
    (mensagem: string | null) => {
      definirReserva(null);
      setAviso(mensagem);
      atualizarGrade();
    },
    [definirReserva, atualizarGrade],
  );

  const onExpirar = useCallback(
    () => encerrarReserva("Sua reserva expirou e os números foram liberados."),
    [encerrarReserva],
  );

  /** Toque num número: reserva na hora (ou libera, se já for seu). As ações rodam em fila, uma de cada vez. */
  function alternar(numero: string) {
    if (pendentes.has(numero)) return;
    setAviso(null);
    setSucesso(null);
    setPendentes((p) => new Set(p).add(numero));
    filaRef.current = filaRef.current.then(async () => {
      const atual = reservaRef.current;
      try {
        if (atual?.numeros.includes(numero)) {
          const r = await api.liberarNumeros(atual.id, [numero]);
          definirReserva(r.status === "aberta" ? { ...atual, numeros: r.numeros } : null);
        } else if (atual) {
          const r = await api.adicionarNumeros(atual.id, [numero]);
          definirReserva({ ...atual, numeros: r.numeros });
        } else {
          const r = await api.criarReserva([numero]);
          definirReserva({ id: r.id, numeros: r.numeros, prazo: Date.now() + r.segundosRestantes * 1000 });
        }
      } catch (e) {
        if (e instanceof ErroApi && e.codigo === "NUMEROS_INDISPONIVEIS") {
          toast.warning(mensagemIndisponiveis(e.numeros ?? [numero]));
        } else if (
          e instanceof ErroApi &&
          ["RESERVA_EXPIRADA", "RESERVA_NAO_ABERTA", "RESERVA_NAO_ENCONTRADA"].includes(e.codigo)
        ) {
          encerrarReserva("Sua reserva expirou. Toque nos números para reservar de novo.");
        } else {
          toast.error(e instanceof Error ? e.message : "Erro inesperado.");
        }
      } finally {
        setPendentes((p) => {
          const novo = new Set(p);
          novo.delete(numero);
          return novo;
        });
        atualizarGrade();
      }
    });
  }

  async function confirmar(dados: { nome: string; telefone: string }) {
    const atual = reservaRef.current;
    if (!atual) return;
    setOcupado("confirmar");
    await filaRef.current;
    try {
      const r = await api.confirmar(atual.id, dados);
      definirReserva(null);
      setSucesso(ordenar(r.numeros));
      atualizarGrade();
    } catch (e) {
      if (e instanceof ErroApi && e.codigo === "RESERVA_EXPIRADA") {
        encerrarReserva("O prazo da sua reserva acabou. Toque nos números para reservar de novo.");
      } else if (e instanceof ErroApi && ["RESERVA_NAO_ABERTA", "RESERVA_NAO_ENCONTRADA"].includes(e.codigo)) {
        encerrarReserva("Esta reserva não está mais aberta.");
      } else {
        toast.error(e instanceof Error ? e.message : "Erro inesperado.");
      }
    } finally {
      setOcupado(null);
    }
  }

  async function cancelar() {
    const atual = reservaRef.current;
    if (!atual) return;
    setOcupado("cancelar");
    await filaRef.current;
    try {
      await api.cancelar(atual.id);
      encerrarReserva(null);
      toast("Reserva cancelada. Os números foram liberados.");
    } catch (e) {
      if (e instanceof ErroApi && ["RESERVA_NAO_ABERTA", "RESERVA_NAO_ENCONTRADA"].includes(e.codigo)) {
        encerrarReserva(null);
      } else {
        toast.error(e instanceof Error ? e.message : "Erro inesperado.");
      }
    } finally {
      setOcupado(null);
    }
  }

  // Meus números (reservados ou a caminho) aparecem como selecionados; os que estou liberando, não.
  const meus = new Set(reserva?.numeros ?? []);
  const selecionados = new Set([...meus].filter((n) => !pendentes.has(n)));
  for (const n of pendentes) if (!meus.has(n)) selecionados.add(n);
  const temNumeros = !!reserva && reserva.numeros.length > 0;

  return (
    <section id="numeros" className="scroll-mt-4 bg-gradient-to-b from-background to-black pt-4 pb-32">
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-5">
        <h2 className="font-display text-2xl font-bold">Escolha seus números</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Toque para reservar · {formatarMoeda(config.valorPorNumeroCentavos)} cada
        </p>

        {aviso && (
          <div role="alert" className="mt-5 flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
            {aviso}
          </div>
        )}

        <div className="mt-5">
          <GradeNumeros
            numeros={numeros}
            selecionados={selecionados}
            carregando={pendentes}
            clicavel={(n) => ocupado === null && (n.status === "livre" || meus.has(n.numero))}
            onClicar={alternar}
          />
          <LegendaGrade comSelecionado />
        </div>

        {temNumeros && reserva && (
          <div ref={formRef} className="mt-6 scroll-mt-4 space-y-4 rounded-xl border border-primary/40 bg-card p-4">
            <TimerReserva numeros={ordenar(reserva.numeros)} prazo={reserva.prazo} onExpirar={onExpirar} />
            <FormConfirmacao
              enviando={ocupado === "confirmar"}
              cancelando={ocupado === "cancelar"}
              onConfirmar={confirmar}
              onCancelar={cancelar}
            />
          </div>
        )}

        {sucesso && (
          <div ref={sucessoRef} className="mt-6 scroll-mt-4 rounded-xl border bg-card p-4">
            <TelaSucesso
              numeros={sucesso}
              valorPorNumeroCentavos={config.valorPorNumeroCentavos}
              pix={config.pix}
              instrucoesPagamento={config.instrucoesPagamento}
              onNovaReserva={() => {
                setSucesso(null);
                document.getElementById("numeros")?.scrollIntoView({ behavior: "smooth" });
              }}
            />
          </div>
        )}
      </div>

      {temNumeros && reserva && (
        <BarraReserva
          quantidade={reserva.numeros.length}
          valorPorNumeroCentavos={config.valorPorNumeroCentavos}
          prazo={reserva.prazo}
          onFinalizar={() => {
            formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            setTimeout(() => document.getElementById("nome")?.focus({ preventScroll: true }), 400);
          }}
        />
      )}
    </section>
  );
}
