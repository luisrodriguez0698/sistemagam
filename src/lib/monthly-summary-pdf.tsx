import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

export interface SummaryItem {
  titulo: string;
  descripcion?: string | null;
  imageUrl?: string | null;
}

export interface MonthlySummaryData {
  agencyName: string;
  clientName: string;
  monthLabel: string; // ej. "Junio 2026"
  videosQuota: number;
  disenosQuota: number;
  disenos: SummaryItem[];
  videos: SummaryItem[];
}

const styles = StyleSheet.create({
  page: { padding: 32, backgroundColor: "#ffffff", fontFamily: "Helvetica" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  clientName: { fontSize: 22, fontWeight: 700, color: "#1f2937" },
  agencyName: { fontSize: 10, color: "#6b7280", marginTop: 2 },
  monthBadge: {
    backgroundColor: "#16a34a",
    color: "#ffffff",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 16,
    fontSize: 12,
    fontWeight: 700,
  },
  subtitle: { fontSize: 10, color: "#4b5563", marginTop: 8, marginBottom: 20 },
  sectionBand: {
    backgroundColor: "#16a34a",
    color: "#ffffff",
    fontSize: 11,
    fontWeight: 700,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 10,
    marginTop: 18,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    width: 110,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 10,
  },
  thumb: { width: "100%", height: 90, objectFit: "cover", backgroundColor: "#f3f4f6" },
  thumbPlaceholder: {
    width: "100%",
    height: 90,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { padding: 6 },
  cardTitle: { fontSize: 8.5, fontWeight: 700, color: "#1f2937" },
  cardDescription: { fontSize: 7.5, color: "#6b7280", marginTop: 2 },
  emptyText: { fontSize: 9, color: "#9ca3af", fontStyle: "italic" },
  footer: { position: "absolute", bottom: 24, left: 32, right: 32, fontSize: 8, color: "#9ca3af", textAlign: "center" },
});

function ItemGrid({ items }: { items: SummaryItem[] }) {
  if (items.length === 0) {
    return <Text style={styles.emptyText}>Sin entregables registrados este mes.</Text>;
  }

  return (
    <View style={styles.grid}>
      {items.map((item, index) => (
        <View key={index} style={styles.card} wrap={false}>
          {item.imageUrl ? (
            <Image src={item.imageUrl} style={styles.thumb} />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <Text style={{ fontSize: 7, color: "#9ca3af" }}>Sin imagen</Text>
            </View>
          )}
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{item.titulo}</Text>
            {item.descripcion && <Text style={styles.cardDescription}>{item.descripcion}</Text>}
          </View>
        </View>
      ))}
    </View>
  );
}

function MonthlySummaryDocument({ data }: { data: MonthlySummaryData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.clientName}>{data.clientName.toUpperCase()}</Text>
            <Text style={styles.agencyName}>{data.agencyName}</Text>
          </View>
          <Text style={styles.monthBadge}>{data.monthLabel.toUpperCase()}</Text>
        </View>
        <Text style={styles.subtitle}>
          Parrilla de contenido · {data.disenosQuota} diseños y {data.videosQuota} videos/reels mensuales
        </Text>

        <Text style={styles.sectionBand}>DISEÑOS</Text>
        <ItemGrid items={data.disenos} />

        <Text style={styles.sectionBand}>VIDEOS / REELS</Text>
        <ItemGrid items={data.videos} />

        <Text style={styles.footer} fixed>
          {data.agencyName} · Resumen generado automáticamente
        </Text>
      </Page>
    </Document>
  );
}

export async function renderMonthlySummaryPdf(data: MonthlySummaryData): Promise<Buffer> {
  return renderToBuffer(<MonthlySummaryDocument data={data} />);
}
