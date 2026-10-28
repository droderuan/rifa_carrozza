import type { Config, Estado, Numero } from "@/lib/dominio/tipos";

export const CONFIG_PADRAO: Config = {
  titulo: "Juntos pela Carrozza",
  subtitulo: "Rifa solidária para reconstruir a fábrica em Jaú",
  descricao: "Rifa solidária para a reconstrução da fábrica da Carrozza Custom Guitars.",
  historia:
    "[TEXTO DE EXEMPLO — editar no painel] Parte da fábrica da Carrozza, em Jaú, desabou. Toda a renda desta rifa vai para a reconstrução da oficina onde nascem as guitarras.",
  valorPorNumeroCentavos: 80000,
  primeiro: 1,
  ultimo: 100,
  minutosReserva: 10,
  maxPorReserva: null,
  instagramUrl: "https://www.instagram.com/p/De-Mr-gBsLA/",
  pix: { chave: "14996577711", titular: "Alexandre Carrozza", banco: "Banco do Brasil" },
  instrucoesPagamento: "Depois do PIX, envie o comprovante no grupo do WhatsApp.",
};

export function criarEstadoInicial(config: Config = CONFIG_PADRAO): Estado {
  const numeros: Record<string, Numero> = {};
  for (let n = config.primeiro; n <= config.ultimo; n++) {
    numeros[String(n)] = { status: "livre", reserva: null };
  }
  return { versao: 1, config: structuredClone(config), reservas: {}, numeros, eventos: [] };
}
