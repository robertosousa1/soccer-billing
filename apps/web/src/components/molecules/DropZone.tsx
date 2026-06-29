"use client";

import { useRef, useState, type DragEvent } from "react";
import { ptBR } from "@/i18n/pt-BR";
import { Button } from "@/components/atoms/Button";

export function DropZone({ onFile, disabled }: { onFile: (file: File) => void; disabled?: boolean }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed px-6 py-12 text-center transition-colors ${
        isDragging ? "border-pitch bg-pitch/5" : "border-line bg-card"
      }`}
    >
      <p className="text-sm text-muted">{ptBR.importar.arraste}</p>
      <Button variant="primary" disabled={disabled} onClick={() => inputRef.current?.click()}>
        {ptBR.importar.escolher}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />
    </div>
  );
}
