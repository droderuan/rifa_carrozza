import { exigirPaginaAdmin } from "@/lib/auth";
import { FormConfig } from "@/components/admin/FormConfig";
import { lerEstado } from "@/lib/db";

export default async function Configuracoes() {
  await exigirPaginaAdmin();
  const { config } = await lerEstado({ fresco: true });
  return (
    <>
      <h1 className="font-display text-2xl font-bold">Configurações</h1>
      <FormConfig config={config} />
    </>
  );
}
