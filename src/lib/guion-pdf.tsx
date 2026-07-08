import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

export interface GuionItem {
  titulo: string;
  descripcion?: string | null;
  guion?: string | null;
}

export interface GuionData {
  clientName: string;
  monthLabel: string; // ej. "Junio 2026"
  items: GuionItem[];
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
  item: { marginBottom: 18, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, padding: 14 },
  itemTitle: { fontSize: 12, fontWeight: 700, color: "#1f2937", marginBottom: 4 },
  itemDescription: { fontSize: 9, color: "#6b7280", marginBottom: 8, fontStyle: "italic" },
  guionText: { fontSize: 9.5, color: "#374151", lineHeight: 1.5 },
  emptyText: { fontSize: 9, color: "#9ca3af", fontStyle: "italic" },
  footerBadge: {
    alignSelf: "center",
    backgroundColor: "#16a34a",
    color: "#ffffff",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 24,
    fontSize: 11,
    fontWeight: 700,
    marginTop: 12,
  },
});

function GuionDocument({ data }: { data: GuionData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <Text style={styles.title}>GUION DE{"\n"}VIDEOS</Text>
          <Text style={styles.monthBadge}>{data.monthLabel.toUpperCase()}</Text>
        </View>

        {data.items.length === 0 ? (
          <Text style={styles.emptyText}>Sin videos seleccionados.</Text>
        ) : (
          data.items.map((item, index) => (
            <View key={index} style={styles.item}>
              <Text style={styles.itemTitle}>{item.titulo}</Text>
              {item.descripcion && <Text style={styles.itemDescription}>{item.descripcion}</Text>}
              <Text style={styles.guionText}>{item.guion || "Sin guion capturado todavía."}</Text>
            </View>
          ))
        )}

        <Text style={styles.footerBadge}>{data.clientName.toUpperCase()}</Text>
      </Page>
    </Document>
  );
}

export async function renderGuionPdf(data: GuionData): Promise<Buffer> {
  return renderToBuffer(<GuionDocument data={data} />);
}
