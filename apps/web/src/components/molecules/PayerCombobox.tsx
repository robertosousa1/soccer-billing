"use client";

import { useEffect, useRef, useState } from "react";
import { normalizeName, toTitle } from "@pelada/core";
import { Input } from "@/components/atoms/Input";
import type { PayerDTO } from "@/services/payers";

interface PayerComboboxProps {
  payers: PayerDTO[];
  value: { payerId: string | null; nome: string };
  onChange: (next: { payerId: string | null; nome: string }) => void;
  placeholder?: string;
}

/** Select com busca: digita pra filtrar pagantes já cadastrados; sem match, mantém o texto como nome de um pagante novo. */
export function PayerCombobox({ payers, value, onChange, placeholder }: PayerComboboxProps) {
  const [query, setQuery] = useState(value.nome);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value.nome);
  }, [value.payerId, value.nome]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const norm = normalizeName(query);
  const matches = (norm ? payers.filter((p) => normalizeName(p.nome).includes(norm)) : payers).slice(0, 6);

  function handleInputChange(text: string) {
    setQuery(text);
    setOpen(true);
    onChange({ payerId: null, nome: text });
  }

  function handleSelect(payer: PayerDTO) {
    setQuery(payer.nome);
    setOpen(false);
    onChange({ payerId: payer.id, nome: payer.nome });
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={query}
        placeholder={placeholder}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-card border border-line bg-white shadow-card">
          {matches.length > 0 ? (
            matches.map((p) => (
              <button
                key={p.id}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-chalk"
                onClick={() => handleSelect(p)}
              >
                {toTitle(p.nome)}
              </button>
            ))
          ) : query.trim() ? (
            <p className="px-3 py-2 text-xs text-muted">
              Ninguém encontrado — &ldquo;{query.trim()}&rdquo; será cadastrado como novo pagante.
            </p>
          ) : (
            <p className="px-3 py-2 text-xs text-muted">Nenhum pagante cadastrado ainda.</p>
          )}
        </div>
      )}
    </div>
  );
}
