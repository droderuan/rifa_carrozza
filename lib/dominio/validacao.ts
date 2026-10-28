import { ErroDominio } from "@/lib/erros";

function invalido(mensagem: string): never {
  throw new ErroDominio("DADOS_INVALIDOS", 400, mensagem);
}

export function normalizarNome(v: unknown): string {
  if (typeof v !== "string") invalido("Informe o nome.");
  const nome = v.trim().replace(/\s+/g, " ");
  if (nome.length < 2 || nome.length > 80) invalido("O nome precisa ter entre 2 e 80 caracteres.");
  return nome;
}

export function normalizarTelefone(v: unknown): string {
  if (typeof v !== "string") invalido("Informe o telefone.");
  let d = v.replace(/\D/g, "");
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) d = d.slice(2);
  const ddd = Number(d.slice(0, 2));
  if ((d.length !== 10 && d.length !== 11) || ddd < 11 || ddd > 99) {
    invalido("Telefone inválido. Use DDD + número, ex.: (21) 99999-8888.");
  }
  return d;
}
