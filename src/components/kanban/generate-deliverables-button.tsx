"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateMonthlyDeliverables } from "@/actions/deliverables";

interface GenerateDeliverablesButtonProps {
  anio: number;
  mes: number;
}

export function GenerateDeliverablesButton({ anio, mes }: GenerateDeliverablesButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = React.useState<string | null>(null);

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      const { created } = await generateMonthlyDeliverables({ anio, mes });
      setMessage(
        created === 0
          ? "Ya están todos los entregables del mes generados."
          : `Se generaron ${created} entregable${created === 1 ? "" : "s"} nuevo${created === 1 ? "" : "s"}.`
      );
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" size="sm" className="gap-1.5" onClick={handleClick} disabled={isPending}>
        <SparklesIcon className="size-4" />
        {isPending ? "Generando..." : "Generar entregables del mes"}
      </Button>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}
