"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransactionFormDialog } from "@/components/finance/transaction-form-dialog";
import type { Tables } from "@/types/database";

interface QuickAddTransactionProps {
  coupleId: string;
  userId: string;
  accounts: Tables<"accounts">[];
  categories: Tables<"categories">[];
  members: { id: string; fullName: string | null }[];
}

/** The "abrir → adicionar → salvar em poucos segundos" shortcut from the main Finance page and dashboard. */
export function QuickAddTransaction(props: QuickAddTransactionProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Adicionar
      </Button>
      <TransactionFormDialog open={open} onOpenChange={setOpen} {...props} onSaved={() => router.refresh()} />
    </>
  );
}
