"use client";
import { Loader2Icon, MessageCircleIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DadosPix } from "@/lib/dominio/tipos";
import { CampoTelefone, type ValorTelefone } from "@/components/CampoTelefone";
import { formatarMoeda, formatarTelefone } from "@/lib/formatar";
import { montarTelefone, telefoneValido } from "@/lib/telefone";

type Props = {
  numeros: string[];
  totalCentavos: number;
  pix?: DadosPix;
  enviando: boolean;
  cancelando: boolean;
  onConfirmar: (dados: { nome: string; telefone: string }) => Promise<void>;
  onCancelar: () => void;
};

export function FormConfirmacao({ numeros, totalCentavos, pix, enviando, cancelando, onConfirmar, onCancelar }: Props) {
  const [nome, setNome] = useState("");
  const [tel, setTel] = useState<ValorTelefone>({ pais: "BR", numero: "" });
  const telefone = montarTelefone(tel.pais, tel.numero);
  const [erroTelefone, setErroTelefone] = useState<string | null>(null);
  const [revisando, setRevisando] = useState(false);
  const ocupado = enviando || cancelando;

  // Valida o básico e abre o modal; a reserva só é confirmada no modal.
  function reservar(e: FormEvent) {
    e.preventDefault();
    const digitos = tel.numero.replace(/\D/g, "");
    if (tel.pais === "BR" ? digitos.length < 10 : !telefoneValido(telefone)) {
      setErroTelefone(
        tel.pais === "BR"
          ? "Informe o telefone com DDD, ex.: (14) 99999-8888."
          : "Número inválido para o país escolhido. Informe o número completo, com código de área.",
      );
      return;
    }
    setErroTelefone(null);
    setRevisando(true);
  }

  async function confirmar() {
    await onConfirmar({ nome, telefone });
    setRevisando(false);
  }

  return (
    <>
      <form onSubmit={reservar} className="space-y-4">
        <div className="flex gap-3 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm">
          <MessageCircleIcon className="mt-0.5 size-5 shrink-0 text-primary" />
          <p className="leading-relaxed">
            Use <strong>o mesmo nome e telefone do grupo do WhatsApp</strong> da rifa. É assim que o organizador
            encontra você e confirma o seu pagamento.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nome">Nome no grupo do WhatsApp</Label>
          <Input
            id="nome"
            autoComplete="name"
            required
            minLength={2}
            maxLength={80}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Como você aparece no grupo"
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="telefone">Telefone do WhatsApp (o mesmo do grupo)</Label>
          <CampoTelefone
            id="telefone"
            valor={tel}
            onChange={(v) => {
              setTel(v);
              setErroTelefone(null);
            }}
            invalido={!!erroTelefone}
          />
          <p className="text-xs text-muted-foreground">Número de fora do Brasil? Toque na bandeira para trocar o país.</p>
          {erroTelefone && <p className="text-xs text-destructive">{erroTelefone}</p>}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button type="submit" disabled={ocupado} className="h-11 w-full text-base font-bold sm:w-auto sm:flex-1">
            Reservar
          </Button>
          <Button type="button" variant="ghost" disabled={ocupado} onClick={onCancelar} className="h-11">
            {cancelando && <Loader2Icon className="animate-spin" />}
            Cancelar reserva
          </Button>
        </div>
      </form>

      <AlertDialog open={revisando} onOpenChange={(aberto) => !ocupado && setRevisando(aberto)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar reserva?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left text-sm">
                <p>
                  {numeros.length === 1 ? "Número" : "Números"}{" "}
                  <strong className="text-foreground">{numeros.join(", ")}</strong> para{" "}
                  <strong className="text-foreground">{nome.trim()}</strong> · {formatarTelefone(telefone)}
                </p>
                <p className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-foreground">
                  Depois de confirmar, faça o <strong>PIX de {formatarMoeda(totalCentavos)}</strong>
                  {pix && (
                    <>
                      {" "}
                      para a chave <strong>{pix.chave}</strong> ({pix.titular} · {pix.banco})
                    </>
                  )}{" "}
                  e envie o comprovante no grupo do WhatsApp. Seus números ficam pendentes até o organizador confirmar
                  o pagamento.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={confirmar} disabled={ocupado} className="h-11 w-full text-base font-bold">
              {enviando && <Loader2Icon className="animate-spin" />}
              Confirmar reserva
            </Button>
            <Button variant="outline" onClick={() => setRevisando(false)} disabled={ocupado} className="h-11 w-full">
              Voltar
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setRevisando(false);
                onCancelar();
              }}
              disabled={ocupado}
              className="h-11 w-full text-destructive hover:text-destructive"
            >
              Cancelar reserva
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
