/**
 * Reescala y re-comprime una imagen en el navegador antes de subirla — solo
 * es una referencia visual para el cliente, no necesita full resolución.
 * Reduce drásticamente el tamaño (una foto de celular de varios MB queda
 * normalmente en un par de cientos de KB), lo cual ahorra espacio/costos en
 * R2 y evita pegarle al límite de tamaño de los Server Actions.
 */
export async function compressImage(
  file: File,
  { maxDimension = 1600, quality = 0.75 }: { maxDimension?: number; quality?: number } = {}
): Promise<File> {
  // Si ya es un GIF (podría ser animado) o ya es chico, no vale la pena
  // reprocesarlo: recomprimir un GIF con canvas pierde la animación.
  if (file.type === "image/gif" || file.size < 200 * 1024) return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) return file;

  const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], newName, { type: "image/jpeg" });
}
