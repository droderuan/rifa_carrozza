"use client";
import { LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function BotaoSair() {
  const router = useRouter();
  async function sair() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    router.replace("/admin/login");
    router.refresh();
  }
  return (
    <Button variant="ghost" size="sm" onClick={sair}>
      <LogOutIcon />
      Sair
    </Button>
  );
}
