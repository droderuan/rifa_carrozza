"use client";
import { ConfirmarAcao } from "@/components/admin/ConfirmarAcao";
import { urlAcao, useAcaoAdmin } from "@/components/admin/useAcaoAdmin";
import { Button } from "@/components/ui/button";
import type { StatusNumero } from "@/lib/dominio/tipos";

type Props = { id: string; numero: string; status: StatusNumero };

export function AcoesNumero({ id, numero, status }: Props) {
  const { executar, executando } = useAcaoAdmin();
  const corpo = { method: "POST", body: JSON.stringify({ numeros: [numero] }) };
  const ocupado = executando !== null;
  if (status !== "pendente" && status !== "confirmado") return null;
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {status === "pendente" ? (
        <Button size="sm" disabled={ocupado} onClick={() => executar("c", urlAcao(id, "confirmar"), corpo, `Número ${numero} confirmado`)}>
          Confirmar
        </Button>
      ) : (
        <ConfirmarAcao
          titulo={`Desfazer confirmação do ${numero}?`}
          descricao="O número volta a ficar pendente."
          confirmar="Desconfirmar"
          onConfirmar={() => executar("d", urlAcao(id, "desconfirmar"), corpo, `Número ${numero} voltou a pendente`)}
        >
          <Button size="sm" variant="outline" disabled={ocupado}>
            Desconfirmar
          </Button>
        </ConfirmarAcao>
      )}
      <ConfirmarAcao
        titulo={`Remover o número ${numero}?`}
        descricao="O número volta a ficar livre para outra pessoa."
        confirmar="Remover"
        onConfirmar={() => executar("r", urlAcao(id, "remover"), corpo, `Número ${numero} liberado`)}
      >
        <Button size="sm" variant="ghost" disabled={ocupado}>
          Remover
        </Button>
      </ConfirmarAcao>
    </div>
  );
}
