import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { getTenantSession } from "@/lib/tenant";
import { renderContentGridPdf, type ContentGridRow, type ContentGridSection } from "@/lib/content-grid-pdf";
import { formatDateOnly } from "@/lib/date-only";
import { isRecurringTipo, TIPO_LABEL, TIPO_ORDER, TIPO_SECTION_LABEL } from "@/lib/deliverable-tipo";

interface RouteParams {
  params: Promise<{ clientId: string }>;
}

/**
 * Genera y descarga la "parrilla de contenido" de planeación de un cliente:
 * título, descripción, fecha de entrega, links e imagen de ejemplo — sin
 * copy ni guion (uso interno del equipo) — para organizar el mes ANTES de
 * empezar a producir. La imagen aquí es de EJEMPLO/inspiración, no la del
 * entregable ya hecho. Distinto del "resumen" (route.ts en /resumen), que
 * lleva la miniatura del entregable ya entregado y es para después de
 * producir el contenido.
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
    where: { clientId, agencyId, anio, mes, ...(ids ? { id: { in: ids } } : {}) },
    orderBy: { titulo: "asc" },
  });

  function toRow(d: (typeof deliverables)[number], numero: string): ContentGridRow {
    return {
      numero,
      titulo: d.titulo,
      descripcion: d.descripcion,
      fechaEntrega: d.fechaEntrega
        ? formatDateOnly(d.fechaEntrega, { day: "2-digit", month: "2-digit", year: "numeric" })
        : null,
      links: d.linksEjemplo,
      imagenEjemploUrl: d.imagenEjemploUrl,
    };
  }

  // Diseño y Video siempre aparecen (son la parrilla recurrente, aunque
  // esté vacía ese mes); los demás tipos (proyectos únicos) solo si el
  // cliente tiene al menos uno ese mes, para no llenar el PDF de secciones
  // vacías que nunca usa.
  const sections: ContentGridSection[] = TIPO_ORDER.filter(
    (tipo) => isRecurringTipo(tipo) || deliverables.some((d) => d.tipo === tipo)
  ).map((tipo) => {
    let counter = 0;
    const rows = deliverables
      .filter((d) => d.tipo === tipo)
      .map((d) => toRow(d, `${TIPO_LABEL[tipo]} ${++counter}`));
    return { tipo, label: TIPO_SECTION_LABEL[tipo], rows };
  });

  const monthLabel = format(new Date(anio, mes - 1, 1), "MMMM yyyy", { locale: es });

  const pdfBuffer = await renderContentGridPdf({
    clientName: client.nombreNegocio,
    monthLabel,
    sections,
  });

  const filename = `parrilla-${client.nombreNegocio.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${anio}-${String(mes).padStart(2, "0")}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
