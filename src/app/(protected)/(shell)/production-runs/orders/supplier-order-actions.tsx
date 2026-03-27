"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { updateOrder } from "@/lib/actions/orders";

export function SupplierOrderActions({ orderId }: { orderId: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleAcknowledge() {
    startTransition(async () => {
      await updateOrder(orderId, { status: "ACKNOWLEDGED" });
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleAcknowledge}
      disabled={isPending}
      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-foreground text-background text-[11px] font-bold uppercase tracking-wider disabled:opacity-50 hover:bg-foreground/90 transition-colors"
    >
      <CheckCircle size={14} />
      {isPending ? "..." : "Accept Order"}
    </button>
  );
}
