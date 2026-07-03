"use client";

import * as React from "react";
import { useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ImageUpIcon, Loader2Icon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/compress-image";
import { removeDeliverableImage, uploadDeliverableImage } from "@/actions/deliverables";

interface DeliverableImageUploadProps {
  deliverableId: string;
  imageUrl?: string | null;
  /**
   * El padre (Drawer) mantiene su propia copia local del entregable para
   * mostrarlo mientras el Drawer sigue abierto; `router.refresh()` solo
   * actualiza los Server Components, no esa copia local. Por eso se avisa
   * también acá, para que el Drawer se actualice al instante sin tener que
   * cerrarlo y volver a abrirlo.
   */
  onUploaded: (url: string) => void;
  onRemoved: () => void;
}

/**
 * Zona para subir (click, arrastrar, o pegar con Ctrl+V) la imagen de
 * referencia de un entregable. La imagen sube a Cloudflare R2 vía Server
 * Action; aquí solo se maneja la interacción — no se conoce nada de R2.
 */
export function DeliverableImageUpload({
  deliverableId,
  imageUrl,
  onUploaded,
  onRemoved,
}: DeliverableImageUploadProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function upload(file: File) {
    setError(null);
    startTransition(async () => {
      try {
        const compressed = await compressImage(file);
        const formData = new FormData();
        formData.set("file", compressed);
        const { url } = await uploadDeliverableImage(deliverableId, formData);
        onUploaded(url);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ocurrió un error al subir la imagen");
      }
    });
  }

  // Referencia siempre actualizada a `upload` (que cierra sobre props como
  // `deliverableId`/`onUploaded`) para que el listener global de abajo, que
  // se suscribe una sola vez, nunca quede con una versión vieja.
  const uploadRef = React.useRef(upload);
  uploadRef.current = upload;

  // Pegar (Ctrl+V) sin necesidad de darle click antes a la zona de subida:
  // el navegador solo dispara "paste" sobre el elemento con foco, así que
  // antes había que pre-seleccionar el div antes de pegar. Escuchando a
  // nivel de documento mientras el Drawer está abierto, Ctrl+V funciona
  // desde cualquier parte (siempre que el portapapeles tenga una imagen; si
  // no la tiene, no hace nada y no interfiere con pegar texto en otros
  // campos).
  React.useEffect(() => {
    function handleGlobalPaste(e: ClipboardEvent) {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith("image/"));
      const file = item?.getAsFile();
      if (file) uploadRef.current(file);
    }
    document.addEventListener("paste", handleGlobalPaste);
    return () => document.removeEventListener("paste", handleGlobalPaste);
  }, []);

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      await removeDeliverableImage(deliverableId);
      onRemoved();
      router.refresh();
    });
  }

  // El lightbox se cierra con un listener global en vez de onClick directo:
  // el Drawer (vaul/Radix) trata cualquier click fuera de su propio Content
  // como "outside" — como el portal del lightbox está fuera de ese árbol,
  // esa detección interna se comía el primer click y el overlay se quedaba
  // "congelado" hasta un segundo intento. Escuchando nosotros mismos en
  // document (capture) evitamos por completo esa pelea de capas.
  React.useEffect(() => {
    if (!previewOpen) return;
    function close() {
      setPreviewOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("pointerdown", close, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", close, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [previewOpen]);

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) upload(file);
  }

  if (imageUrl) {
    return (
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Imagen de referencia</p>
        <div className="group relative w-40 overflow-hidden rounded-lg border">
          {/* eslint-disable-next-line @next/next/no-img-element -- imagen externa (R2), no optimizable por next/image sin configurar dominio remoto */}
          <img
            src={imageUrl}
            alt="Referencia del entregable"
            onClick={() => setPreviewOpen(true)}
            className="aspect-square w-full cursor-zoom-in object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm hover:bg-destructive hover:text-destructive-foreground"
            aria-label="Eliminar imagen"
          >
            {isPending ? <Loader2Icon className="size-3.5 animate-spin" /> : <XIcon className="size-3.5" />}
          </button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}

        {previewOpen &&
          createPortal(
            <div
              onClick={() => setPreviewOpen(false)}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6"
            >
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm hover:bg-muted"
                aria-label="Cerrar"
              >
                <XIcon className="size-5" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element -- imagen externa (R2) */}
              <img
                src={imageUrl}
                alt="Referencia del entregable (tamaño completo)"
                className="max-h-[85vh] max-w-[90vw] cursor-zoom-out rounded-lg object-contain shadow-2xl"
              />
            </div>,
            document.body
          )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">Imagen de referencia</p>
      <div
        tabIndex={0}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex h-28 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground transition-colors hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-ring",
          isDraggingOver && "bg-muted/60 ring-2 ring-ring"
        )}
      >
        {isPending ? (
          <Loader2Icon className="size-5 animate-spin" />
        ) : (
          <>
            <ImageUpIcon className="size-5" />
            <span>Click, arrastra, o pega (Ctrl+V) una imagen</span>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
