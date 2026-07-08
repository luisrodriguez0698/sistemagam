import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { getTenantSession } from "@/lib/tenant";
import { renderGuionPdf, type GuionItem } from "@/lib/guion-pdf";

interface RouteParams {
  params: Promise<{ clientId: string }>;
}

/**
 * Genera y descarga el guion de los videos de un cliente en un mes — solo
 * tipo VIDEO (el guion no aplica a diseño/logo/etc.). Igual que parrilla y
 * resumen, acepta `ids` para restringir a solo los videos marcados en el
 * Drawer de exportar, en vez de siempre traer todos los del mes.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { clientId } = await params;
  const { agencyId } = await getTenantSession();

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const anio = Number(searchParams.get("anio")) || now.getFullYear();
  const mes = Number(searchParams.get("mes")) || now.getMonth() + 1;
  const idsParam = searchParams.get("ids");
  const ids = idsParam ? idsParam.split(",").filter(Boolean) : undefined;

  const client = await prisma.client.findFirst({ where: { id: clientId, agencyId } });
  if (!client) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

  const deliverables = await prisma.deliverable.findMany({
    where: {
      clientId,
      agencyId,
      anio,
      mes,
      tipo: "VIDEO",
      ...(ids ? { id: { in: ids } } : {}),
    },
    orderBy: { titulo: "asc" },
  });

  const items: GuionItem[] = deliverables.map((d) => ({
    titulo: d.titulo,
    descripcion: d.descripcion,
    guion: d.guion,
  }));

  const monthLabel = format(new Date(anio, mes - 1, 1), "MMMM yyyy", { locale: es });

  const pdfBuffer = await renderGuionPdf({ clientName: client.nombreNegocio, monthLabel, items });

  const filename = `guion-${client.nombreNegocio.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${anio}-${String(mes).padStart(2, "0")}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
