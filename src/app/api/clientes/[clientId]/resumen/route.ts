import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { getTenantSession } from "@/lib/tenant";
import { renderMonthlySummaryPdf, type SummaryItem, type SummarySection } from "@/lib/monthly-summary-pdf";
import { isRecurringTipo, TIPO_ORDER, TIPO_SECTION_LABEL } from "@/lib/deliverable-tipo";

interface RouteParams {
  params: Promise<{ clientId: string }>;
}

/**
 * Genera y descarga el resumen mensual de un cliente (parrilla de
 * contenido con miniaturas + links) en PDF, para compartirle. Es una ruta
 * API (no una Server Action) porque el navegador necesita poder abrirla
 * directamente para descargar el archivo binario.
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

  const client = await prisma.client.findFirst({
    where: { id: clientId, agencyId },
    include: { deliverableConfig: true, agency: { select: { name: true } } },
  });
  if (!client) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

  const deliverables = await prisma.deliverable.findMany({
    where: { clientId, agencyId, anio, mes, ...(ids ? { id: { in: ids } } : {}) },
    orderBy: { titulo: "asc" },
  });

  const toSummaryItem = (d: (typeof deliverables)[number]): SummaryItem => ({
    titulo: d.titulo,
    descripcion: d.descripcion,
    imageUrl: d.archivoUrl,
  });

  // Diseño y Video siempre aparecen (son la parrilla recurrente, aunque
  // esté vacía ese mes); los demás tipos (proyectos únicos) solo si el
  // cliente tiene al menos uno ese mes.
  const sections: SummarySection[] = TIPO_ORDER.filter(
    (tipo) => isRecurringTipo(tipo) || deliverables.some((d) => d.tipo === tipo)
  ).map((tipo) => ({
    tipo,
    label: TIPO_SECTION_LABEL[tipo],
    items: deliverables.filter((d) => d.tipo === tipo).map(toSummaryItem),
  }));

  const monthLabel = format(new Date(anio, mes - 1, 1), "MMMM yyyy", { locale: es });

  const pdfBuffer = await renderMonthlySummaryPdf({
    agencyName: client.agency.name,
    clientName: client.nombreNegocio,
    monthLabel,
    videosQuota: client.deliverableConfig.find((c) => c.tipo === "VIDEO")?.cantidadMensual ?? 0,
    disenosQuota: client.deliverableConfig.find((c) => c.tipo === "DISENO")?.cantidadMensual ?? 0,
    sections,
  });

  const filename = `resumen-${client.nombreNegocio.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${anio}-${String(mes).padStart(2, "0")}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
