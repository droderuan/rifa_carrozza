"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { chamar } from "@/lib/cliente/api";

/** Chama uma rota admin, mostra o resultado e recarrega os dados da página. */
export function useAcaoAdmin() {
  const router = useRouter();
  const [executando, setExecutando] = useState<string | null>(null);

  async function executar(chave: string, url: string, init: RequestInit, sucesso: string): Promise<boolean> {
    setExecutando(chave);
    try {
      await chamar(url, init);
      toast.success(sucesso);
      router.refresh();
      return true;
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : "Erro inesperado.";
      toast.error(mensagem);
      if (e instanceof Error && "codigo" in e && e.codigo === "NAO_AUTORIZADO") router.replace("/admin/login");
      return false;
    } finally {
      setExecutando(null);
    }
  }

  return { executar, executando };
}

export function urlAcao(id: string, acao: "confirmar" | "desconfirmar" | "remover") {
  return `/api/admin/reservas/${encodeURIComponent(id)}/${acao}`;
}
