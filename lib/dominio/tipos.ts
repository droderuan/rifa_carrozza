export type StatusNumero = "livre" | "reservado" | "pendente" | "confirmado";
export type StatusReserva = "aberta" | "solicitada" | "expirada" | "cancelada";

export interface DadosPix {
  chave: string;
  titular: string;
  banco: string;
}

export interface Config {
  titulo: string;
  descricao: string;
  valorPorNumeroCentavos: number; // ex.: 80000 = R$ 800,00
  primeiro: number;
  ultimo: number;
  minutosReserva: number;
  maxPorReserva: number | null; // null = sem limite
  instrucoesPagamento: string; // texto exibido após a confirmação da reserva
  subtitulo?: string; // linha abaixo do título no topo
  historia?: string; // "O que aconteceu" — parágrafos separados por \n\n
  instagramUrl?: string; // post exibido na página; ausente = sem seção de vídeo
  pix?: DadosPix;
}

export interface Reserva {
  id: string; // "r_" + 10 caracteres aleatórios
  status: StatusReserva;
  nome: string | null; // null enquanto aberta
  telefone: string | null; // só dígitos, com DDD, sem 55. null enquanto aberta
  criadaEm: string; // ISO 8601 UTC
  expiraEm: string; // ISO 8601 UTC (criadaEm + minutosReserva)
  solicitadaEm: string | null; // quando o comprador confirmou
}

export interface Numero {
  status: StatusNumero;
  reserva: string | null; // null se e somente se status === "livre"
}

export type AcaoEvento =
  | "reservado"
  | "solicitado"
  | "cancelado"
  | "expirado"
  | "confirmado"
  | "desconfirmado"
  | "removido"
  | "perfil_editado";

export interface Evento {
  em: string; // ISO 8601 UTC
  acao: AcaoEvento;
  por: "comprador" | "admin" | "sistema";
  reserva: string;
  numeros: string[]; // vazio em perfil_editado
  nome?: string; // snapshot do perfil no momento do evento
  telefone?: string;
  de?: { nome?: string; telefone?: string }; // só em perfil_editado
  para?: { nome?: string; telefone?: string }; // só em perfil_editado
}

export interface Estado {
  versao: 1;
  config: Config;
  reservas: Record<string, Reserva>;
  numeros: Record<string, Numero>; // chave: "1".."100"
  eventos: Evento[]; // append-only
}
