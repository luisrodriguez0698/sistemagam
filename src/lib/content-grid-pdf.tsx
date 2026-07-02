import { Document, Link, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

export interface ContentGridRow {
  numero: string; // ej. "Diseño 1", "Video 3"
  titulo: string;
  descripcion?: string | null;
  fechaEntrega?: string | null; // ya formateada, ej. "17/06/2026"
  link?: string | null;
}

export interface ContentGridData {
  clientName: string;
  monthLabel: string; // ej. "Junio 2026"
  disenos: ContentGridRow[];
  videos: ContentGridRow[];
}

const styles = StyleSheet.create({
  page: { padding: 32, backgroundColor: "#ffffff", fontFamily: "Helvetica" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: 700, color: "#1f2937" },
  monthBadge: {
    backgroundColor: "#16a34a",
    color: "#ffffff",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 16,
    fontSize: 12,
    fontWeight: 700,
  },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: "#1f2937", marginTop: 18, marginBottom: 8 },
  table: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 4, overflow: "hidden" },
  headRow: { flexDirection: "row", backgroundColor: "#16a34a" },
  headCell: { padding: 8, fontSize: 9, fontWeight: 700, color: "#ffffff" },
  row: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#e5e7eb" },
  cell: { padding: 8, fontSize: 9, color: "#374151", justifyContent: "center" },
  numCol: { width: "12%", backgroundColor: "#f0fdf4" },
  tituloCol: { width: "19%" },
  descCol: { width: "33%" },
  fechaCol: { width: "14%" },
  linkCol: { width: "22%" },
  linkText: { color: "#2563eb", textDecoration: "underline" },
  emptyText: { fontSize: 9, color: "#9ca3af", fontStyle: "italic", padding: 8 },
  footerBadge: {
    alignSelf: "center",
    backgroundColor: "#16a34a",
    color: "#ffffff",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 24,
    fontSize: 11,
    fontWeight: 700,
    marginTop: 24,
  },
});

function GridTable({ rows }: { rows: ContentGridRow[] }) {
  if (rows.length === 0) {
    return (
      <View style={styles.table}>
        <Text style={styles.emptyText}>Sin entregables planeados todavía.</Text>
      </View>
    );
  }

  return (
    <View style={styles.table}>
      <View style={styles.headRow}>
        <Text style={[styles.headCell, styles.numCol]}>#</Text>
        <Text style={[styles.headCell, styles.tituloCol]}>TÍTULO</Text>
        <Text style={[styles.headCell, styles.descCol]}>DESCRIPCIÓN</Text>
        <Text style={[styles.headCell, styles.fechaCol]}>FECHA DE ENTREGA</Text>
        <Text style={[styles.headCell, styles.linkCol]}>LINK DE EJEMPLO</Text>
      </View>
      {rows.map((row, index) => (
        <View key={index} style={styles.row} wrap={false}>
          <Text style={[styles.cell, styles.numCol, { fontWeight: 700 }]}>{row.numero}</Text>
          <Text style={[styles.cell, styles.tituloCol]}>{row.titulo}</Text>
          <Text style={[styles.cell, styles.descCol]}>{row.descripcion || "—"}</Text>
          <Text style={[styles.cell, styles.fechaCol]}>{row.fechaEntrega || "—"}</Text>
          {row.link ? (
            <Link src={row.link} style={[styles.cell, styles.linkCol, styles.linkText]}>
              Ver ejemplo
            </Link>
          ) : (
            <Text style={[styles.cell, styles.linkCol]}>—</Text>
          )}
        </View>
      ))}
    </View>
  );
}

function ContentGridDocument({ data }: { data: ContentGridData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>PARRILLA DE{"\n"}CONTENIDO</Text>
          <Text style={styles.monthBadge}>{data.monthLabel.toUpperCase()}</Text>
        </View>

        <Text style={styles.sectionTitle}>DISEÑOS</Text>
        <GridTable rows={data.disenos} />

        <Text style={styles.sectionTitle}>VIDEOS / REELS</Text>
        <GridTable rows={data.videos} />

        <Text style={styles.footerBadge}>{data.clientName.toUpperCase()}</Text>
      </Page>
    </Document>
  );
}

export async function renderContentGridPdf(data: ContentGridData): Promise<Buffer> {
  return renderToBuffer(<ContentGridDocument data={data} />);
}
