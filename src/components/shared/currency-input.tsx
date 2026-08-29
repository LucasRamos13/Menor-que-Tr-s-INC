"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { centsToDecimalString, parseBRLToCents } from "@/lib/money";

interface CurrencyInputProps {
  valueCents: number;
  onChangeCents: (cents: number) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Text input for money that always types like a Brazilian keyboard expects
 * (comma decimal, dot thousands) and only ever emits integer cents upward —
 * the rest of the app never touches a floating-point real.
 */
export function CurrencyInput({ valueCents, onChangeCents, id, placeholder = "0,00", disabled }: CurrencyInputProps) {
  const [text, setText] = React.useState(valueCents ? centsToDecimalString(valueCents) : "");

  React.useEffect(() => {
    setText(valueCents ? centsToDecimalString(valueCents) : "");
    // Only resync from outside changes (e.g. loading a record to edit); typing owns `text` otherwise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueCents === 0]);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">R$</span>
      <Input
        id={id}
        inputMode="decimal"
        placeholder={placeholder}
        disabled={disabled}
        className="pl-9"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const cents = parseBRLToCents(e.target.value);
          if (cents !== null) onChangeCents(cents);
        }}
        onBlur={() => setText(valueCents ? centsToDecimalString(valueCents) : "")}
      />
    </div>
  );
}
