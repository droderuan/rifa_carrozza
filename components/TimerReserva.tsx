"use client";
import { useEffect, useState } from "react";

type Props = { numeros: string[]; prazo: number; onExpirar: () => void };

export function TimerReserva({ numeros, prazo, onExpirar }: Props) {
  const [restante, setRestante] = useState(() => prazo - Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      const r = prazo - Date.now();
      setRestante(r);
      if (r <= 0) {
        clearInterval(id);
        onExpirar();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [prazo, onExpirar]);

  if (restante <= 0) return null;
  const min = Math.floor(restante / 60000);
  const seg = String(Math.floor((restante % 60000) / 1000)).padStart(2, "0");

  return (
    <p className="text-sm leading-relaxed">
      Você reservou os números {numeros.join(", ")} e tem{" "}
      <span className="font-display text-base font-bold text-primary tabular-nums">
        {min}:{seg}
      </span>{" "}
      para confirmar.
    </p>
  );
}
