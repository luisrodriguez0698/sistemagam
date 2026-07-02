import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

// Cloudflare R2 expone una API compatible con S3; el mismo SDK de AWS
// funciona apuntando al endpoint de la cuenta de Cloudflare en vez de a AWS.
const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;

/**
 * Sube un archivo al bucket bajo `clienteId/entregableId-timestamp.ext`, así
 * queda organizado por carpeta de cliente dentro de R2. Devuelve tanto la
 * URL pública (r2.dev / dominio custom) como el object key — el key se
 * guarda en la base de datos porque es lo que se necesita para poder
 * reemplazar o borrar el archivo después.
 */
export async function uploadDeliverableImage(clientId: string, deliverableId: string, file: File) {
  const extension = file.name.split(".").pop() || "jpg";
  const key = `${clientId}/${deliverableId}-${Date.now()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type || "image/jpeg",
    })
  );

  return { key, url: getPublicUrl(key) };
}

export async function deleteR2Object(key: string) {
  await r2Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export function getPublicUrl(key: string) {
  const base = process.env.R2_PUBLIC_URL!.replace(/\/$/, "");
  return `${base}/${key}`;
}
