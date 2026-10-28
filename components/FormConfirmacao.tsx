"use client";
import { Loader2Icon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mascaraTelefone } from "@/lib/formatar";

type Props = {
  enviando: boolean;
  cancelando: boolean;
  onConfirmar: (dados: { nome: string; telefone: string }) => void;
  onCancelar: () => void;
};

export function FormConfirmacao({ enviando, cancelando, onConfirmar, onCancelar }: Props) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const ocupado = enviando || cancelando;

  function enviar(e: FormEvent) {
    e.preventDefault();
    onConfirmar({ nome, telefone });
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="nome">Seu nome</Label>
        <Input
          id="nome"
          autoComplete="name"
          required
          minLength={2}
          maxLength={80}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Como aparece no grupo"
          className="h-11"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="telefone">Telefone do WhatsApp</Label>
        <Input
          id="telefone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          required
          value={telefone}
          onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
          placeholder="(00) 00000-0000"
          className="h-11"
        />
        <p className="text-xs text-muted-foreground">O mesmo número que você usa no grupo.</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button type="submit" disabled={ocupado} className="h-11 flex-1 text-base font-bold">
          {enviando && <Loader2Icon className="animate-spin" />}
          Confirmar reserva
        </Button>
        <Button type="button" variant="ghost" disabled={ocupado} onClick={onCancelar} className="h-11">
          {cancelando && <Loader2Icon className="animate-spin" />}
          Cancelar reserva
        </Button>
      </div>
    </form>
  );
}
