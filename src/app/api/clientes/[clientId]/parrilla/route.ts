import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { getTenantSession } from "@/lib/tenant";
import { renderContentGridPdf, type ContentGridRow } from "@/lib/content-grid-pdf";
import { formatDateOnly } from "@/lib/date-only";

interface RouteParams {
  params: Promise<{ clientId: string }>;
}

/**
 * Genera y descarga la "parrilla de contenido" de planeación de un cliente:
 * solo título, descripción y fecha de entrega — sin imágenes ni copy, para
 * organizar el mes ANTES de empezar a producir. Distinto del "resumen"
 * (route.ts en /resumen), que sí lleva miniaturas y es para después de
 * entregar el contenido.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { clientId } = await params;
  const { agencyId } = await getTenantSession();

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const anio = Number(searchParams.get("anio")) || now.getFullYear();
  const mes = Number(searchParams.get("mes")) || now.getMonth() + 1;

  const client = await prisma.client.findFirst({ where: { id: clientId, agencyId } });
  if (!client) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

  const deliverables = await prisma.deliverable.findMany({
    where: { clientId, agencyId, anio, mes },
    orderBy: { titulo: "asc" },
  });

  let disenoCounter = 0;
  let videoCounter = 0;
  const toRow =
    (tipo: "DISENO" | "VIDEO") =>
    (d: (typeof deliverables)[number]): ContentGridRow => ({
      numero: tipo === "DISENO" ? `Diseño ${++disenoCounter}` : `Video ${++videoCounter}`,
      titulo: d.titulo,
      descripcion: d.descripcion,
      fechaEntrega: d.fechaEntrega
        ? formatDateOnly(d.fechaEntrega, { day: "2-digit", month: "2-digit", year: "numeric" })
        : null,
      link: d.linkEjemplo,
    });

  const monthLabel = format(new Date(anio, mes - 1, 1), "MMMM yyyy", { locale: es });

  const pdfBuffer = await renderContentGridPdf({
    clientName: client.nombreNegocio,
    monthLabel,
    disenos: deliverables.filter((d) => d.tipo === "DISENO").map(toRow("DISENO")),
    videos: deliverables.filter((d) => d.tipo === "VIDEO").map(toRow("VIDEO")),
  });

  const filename = `parrilla-${client.nombreNegocio.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${anio}-${String(mes).padStart(2, "0")}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
