/**
 * `fechaEntrega` (y cualquier fecha "de calendario" similar) representa un
 * DÍA, no un instante — se guarda como medianoche UTC. Si al mostrarla se
 * usa el huso horario LOCAL del navegador/servidor (como hacía
 * `Intl.DateTimeFormat` o `date-fns` por defecto), en cualquier zona
 * horaria detrás de UTC (México, UTC-6) la medianoche UTC cae en la TARDE
 * del día anterior, y el día mostrado se corre uno hacia atrás. Por eso
 * cualquier formateo de estas fechas para mostrar debe fijar `timeZone:
 * "UTC"` explícitamente — nunca dejarlo en el huso horario local.
 */
export function formatDateOnly(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" }
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-MX", { ...options, timeZone: "UTC" }).format(d);
}
