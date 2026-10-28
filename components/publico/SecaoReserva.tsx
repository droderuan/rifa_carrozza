"use client";
import { AlertCircleIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FormConfirmacao } from "@/components/FormConfirmacao";
import { GradeNumeros, LegendaGrade } from "@/components/GradeNumeros";
import { BarraSelecao } from "@/components/publico/BarraSelecao";
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
import { podarSelecao } from "@/lib/cliente/selecao";
import type { NumeroPublico } from "@/lib/dominio/publico";
import type { Config } from "@/lib/dominio/tipos";
import { formatarMoeda } from "@/lib/formatar";

const INTERVALO_ATUALIZACAO_MS = 15_000;

type Fase =
  | { tipo: "selecionando" }
  | { tipo: "reservada"; reserva: ReservaAtiva }
  | { tipo: "sucesso"; numeros: string[] };

type Props = { config: Config; numerosIniciais: NumeroPublico[] };

const storage = () => window.localStorage;

function mensagemIndisponiveis(numeros: string[]) {
  return `Os números ${numeros.join(", ")} acabaram de ser reservados por outra pessoa.`;
}

export function SecaoReserva({ config: configInicial, numerosIniciais }: Props) {
  const [config, setConfig] = useState(configInicial);
  const [numeros, setNumeros] = useState(numerosIniciais);
  const [selecao, setSelecao] = useState<string[]>([]);
  const [fase, setFase] = useState<Fase>({ tipo: "selecionando" });
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<"reservar" | "confirmar" | "cancelar" | null>(null);
  const selecaoRef = useRef(selecao);
  useEffect(() => {
    selecaoRef.current = selecao;
  }, [selecao]);
  const painelRef = useRef<HTMLDivElement>(null);

  const atualizarGrade = useCallback(async () => {
    try {
      const v = await api.obterRifa();
      setNumeros(v.numeros);
      setConfig(v.config);
      const { mantidos, removidos } = podarSelecao(selecaoRef.current, v.numeros);
      if (removidos.length) {
        setSelecao(mantidos);
        toast.warning(mensagemIndisponiveis(removidos));
      }
    } catch {
      // Falha momentânea de rede: a próxima atualização tenta de novo.
    }
  }, []);

  // Atualiza a cada 15 s e quando a aba volta ao foco.
  useEffect(() => {
    const id = setInterval(atualizarGrade, INTERVALO_ATUALIZACAO_MS);
    const aoVoltar = () => document.visibilityState === "visible" && atualizarGrade();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [atualizarGrade]);

  // Retoma a reserva aberta deste navegador.
  useEffect(() => {
    const salva = lerReservaAtiva(storage());
    if (!salva) return;
    api
      .obterReserva(salva.id)
      .then((r) => {
        if (r.status === "aberta" && r.segundosRestantes > 0) {
          const reserva = { id: r.id, numeros: r.numeros, prazo: Date.now() + r.segundosRestantes * 1000 };
          salvarReservaAtiva(storage(), reserva);
          setFase({ tipo: "reservada", reserva });
        } else {
          limparReservaAtiva(storage());
        }
      })
      .catch((e) => {
        if (e instanceof ErroApi && e.codigo === "RESERVA_NAO_ENCONTRADA") limparReservaAtiva(storage());
      });
  }, []);

  useEffect(() => {
    if (fase.tipo !== "selecionando") painelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [fase.tipo]);

  const voltarParaSelecao = useCallback(
    (mensagem: string | null) => {
      limparReservaAtiva(storage());
      setFase({ tipo: "selecionando" });
      setAviso(mensagem);
      atualizarGrade();
    },
    [atualizarGrade],
  );

  const onExpirar = useCallback(() => voltarParaSelecao("Sua reserva expirou."), [voltarParaSelecao]);

  function alternar(numero: string) {
    setAviso(null);
    setSelecao((s) => (s.includes(numero) ? s.filter((n) => n !== numero) : [...s, numero]));
  }

  async function reservar() {
    const max = config.maxPorReserva;
    if (max !== null && selecao.length > max) {
      setAviso(`Você pode reservar no máximo ${max} números por vez.`);
      return;
    }
    setOcupado("reservar");
    setAviso(null);
    try {
      const ordenada = [...selecao].sort((a, b) => Number(a) - Number(b));
      const r = await api.criarReserva(ordenada);
      const reserva = { id: r.id, numeros: r.numeros, prazo: Date.now() + r.segundosRestantes * 1000 };
      salvarReservaAtiva(storage(), reserva);
      setSelecao([]);
      setFase({ tipo: "reservada", reserva });
      atualizarGrade();
    } catch (e) {
      if (e instanceof ErroApi && e.codigo === "NUMEROS_INDISPONIVEIS" && e.numeros) {
        const indisponiveis = e.numeros;
        setAviso(mensagemIndisponiveis(indisponiveis));
        setSelecao((s) => s.filter((n) => !indisponiveis.includes(n)));
        atualizarGrade();
      } else {
        toast.error(e instanceof Error ? e.message : "Erro inesperado.");
      }
    } finally {
      setOcupado(null);
    }
  }

  async function confirmar(reserva: ReservaAtiva, dados: { nome: string; telefone: string }) {
    setOcupado("confirmar");
    try {
      const r = await api.confirmar(reserva.id, dados);
      limparReservaAtiva(storage());
      setFase({ tipo: "sucesso", numeros: r.numeros });
      atualizarGrade();
    } catch (e) {
      if (e instanceof ErroApi && e.codigo === "RESERVA_EXPIRADA") {
        voltarParaSelecao("O prazo da sua reserva acabou. Escolha os números de novo.");
      } else if (e instanceof ErroApi && ["RESERVA_NAO_ABERTA", "RESERVA_NAO_ENCONTRADA"].includes(e.codigo)) {
        voltarParaSelecao("Esta reserva não está mais aberta.");
      } else {
        toast.error(e instanceof Error ? e.message : "Erro inesperado.");
      }
    } finally {
      setOcupado(null);
    }
  }

  async function cancelar(reserva: ReservaAtiva) {
    setOcupado("cancelar");
    try {
      await api.cancelar(reserva.id);
      voltarParaSelecao(null);
      toast("Reserva cancelada. Os números foram liberados.");
    } catch (e) {
      if (e instanceof ErroApi && ["RESERVA_NAO_ABERTA", "RESERVA_NAO_ENCONTRADA"].includes(e.codigo)) {
        voltarParaSelecao(null);
      } else {
        toast.error(e instanceof Error ? e.message : "Erro inesperado.");
      }
    } finally {
      setOcupado(null);
    }
  }

  const selecionando = fase.tipo === "selecionando";
  const selecionados = new Set(selecao);

  return (
    <section id="numeros" className="scroll-mt-4 bg-gradient-to-b from-background to-black pt-4 pb-32">
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-5">
        <h2 className="font-display text-2xl font-bold">Escolha seus números</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Toque nos números livres · {formatarMoeda(config.valorPorNumeroCentavos)} cada
        </p>

        <div ref={painelRef} className="scroll-mt-4">
          {fase.tipo === "reservada" && (
            <div className="mt-5 space-y-4 rounded-xl border border-primary/40 bg-card p-4">
              <TimerReserva numeros={fase.reserva.numeros} prazo={fase.reserva.prazo} onExpirar={onExpirar} />
              <FormConfirmacao
                enviando={ocupado === "confirmar"}
                cancelando={ocupado === "cancelar"}
                onConfirmar={(d) => confirmar(fase.reserva, d)}
                onCancelar={() => cancelar(fase.reserva)}
              />
            </div>
          )}
          {fase.tipo === "sucesso" && (
            <div className="mt-5 rounded-xl border bg-card p-4">
              <TelaSucesso
                numeros={fase.numeros}
                valorPorNumeroCentavos={config.valorPorNumeroCentavos}
                pix={config.pix}
                instrucoesPagamento={config.instrucoesPagamento}
                onNovaReserva={() => setFase({ tipo: "selecionando" })}
              />
            </div>
          )}
        </div>

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
            clicavel={(n) => selecionando && n.status === "livre"}
            onClicar={alternar}
          />
          <LegendaGrade comSelecionado />
        </div>
      </div>

      {selecionando && selecao.length > 0 && (
        <BarraSelecao
          quantidade={selecao.length}
          valorPorNumeroCentavos={config.valorPorNumeroCentavos}
          reservando={ocupado === "reservar"}
          onReservar={reservar}
        />
      )}
    </section>
  );
}
