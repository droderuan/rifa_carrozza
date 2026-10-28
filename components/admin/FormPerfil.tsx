"use client";
import { Loader2Icon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAcaoAdmin } from "@/components/admin/useAcaoAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CampoTelefone } from "@/components/CampoTelefone";
import { montarTelefone, separarTelefone } from "@/lib/telefone";

type Props = { id: string; nome: string; telefone: string; onSalvo?: () => void };

export function FormPerfil({ id, nome: nomeInicial, telefone: telInicial, onSalvo }: Props) {
  const [nome, setNome] = useState(nomeInicial);
  const [tel, setTel] = useState(() => separarTelefone(telInicial));
  const { executar, executando } = useAcaoAdmin();

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const ok = await executar(
      "perfil",
      `/api/admin/reservas/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify({ nome, telefone: montarTelefone(tel.pais, tel.numero) }) },
      "Perfil salvo",
    );
    if (ok) onSalvo?.();
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor={`nome-${id}`}>Nome</Label>
        <Input id={`nome-${id}`} value={nome} onChange={(e) => setNome(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`tel-${id}`}>Telefone</Label>
        <CampoTelefone id={`tel-${id}`} valor={tel} onChange={setTel} />
      </div>
      <Button type="submit" disabled={executando !== null}>
        {executando && <Loader2Icon className="animate-spin" />}
        Salvar
      </Button>
    </form>
  );
}
