"use client";

import { ImagePlus, Move, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type TripCover = { coverVersion?: Date | string | null; coverX?: number | null; coverY?: number | null; coverZoom?: number | null };
export function coverUrl(id: string, version: Date | string) {
  return `/api/trips/${id}/cover?v=${encodeURIComponent(new Date(version).toISOString())}`;
}
export function coverStyle(image: string, x: number, y: number, zoom: number) {
  return { backgroundImage: `url("${image}")`, backgroundSize: "cover", backgroundPosition: `${x}% ${y}%`, transform: `scale(${zoom})`, transformOrigin: `${x}% ${y}%` };
}

async function resizePhoto(file: File) {
  if (!file.type.startsWith("image/") || file.size > 20 * 1024 * 1024) throw new Error("Choose an image smaller than 20 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to prepare this photo.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.7, 0.5, 0.35]) {
      const image = canvas.toDataURL("image/jpeg", quality);
      if (image.length <= 700_000) return image;
    }
    throw new Error("This photo is too detailed. Choose a smaller image.");
  } finally { bitmap.close(); }
}

export function TripCoverDialog({ trip }: { trip: TripCover & { id: string; name: string } }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dimensions = useRef({ width: 0, height: 0 });
  const dragDepth = useRef(0);
  const drag = useRef<{ pointer: number; left: number; top: number; x: number; y: number; overflowX: number; overflowY: number } | null>(null);
  const preview = image ?? (trip.coverVersion ? coverUrl(trip.id, trip.coverVersion) : null);

  useEffect(() => {
    dimensions.current = { width: 0, height: 0 };
    if (!preview) return;
    const photo = new Image();
    photo.onload = () => { dimensions.current = { width: photo.naturalWidth, height: photo.naturalHeight }; };
    photo.src = preview;
    return () => { photo.onload = null; };
  }, [preview]);

  async function choosePhoto(file: File) {
    if (busy) return;
    setBusy(true); setError(null);
    try { setImage(await resizePhoto(file)); setX(50); setY(50); setZoom(1); }
    catch (error) { setError(error instanceof Error ? error.message : "Unable to open this photo. Try JPEG, PNG, or WebP."); }
    finally { setBusy(false); }
  }

  async function save(remove = false) {
    setBusy(true); setError(null);
    try {
      let data = image;
      if (!remove && !data && preview) {
        const response = await fetch(preview);
        if (!response.ok) throw new Error("Unable to load the current photo. Try replacing it.");
        const buffer = new Uint8Array(await response.arrayBuffer());
        data = `data:image/jpeg;base64,${btoa(Array.from(buffer, (byte) => String.fromCharCode(byte)).join(""))}`;
      }
      const response = await fetch(`/api/trips/${trip.id}/cover`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: remove ? null : data, x, y, zoom }) });
      if (!response.ok) throw new Error((await response.json()).error || "Unable to save the photo.");
      router.refresh(); setOpen(false);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to save the photo."); }
    finally { setBusy(false); }
  }

  return <Dialog open={open} onOpenChange={(value) => {
    if (busy) return;
    setOpen(value);
    if (value) { setImage(null); setX(trip.coverX ?? 50); setY(trip.coverY ?? 50); setZoom(trip.coverZoom ?? 1); setError(null); setDragOver(false); dragDepth.current = 0; }
  }}>
    <DialogTrigger asChild><Button variant="ghost" size="sm" className="min-h-11"><ImagePlus className="size-4" />{trip.coverVersion ? "Edit photo" : "Add photo"}</Button></DialogTrigger>
    <DialogContent>
      <DialogHeader><DialogTitle>Trip background photo</DialogTitle><DialogDescription>Choose a photo for {trip.name}, then adjust its framing. Your photo is shared with trip members.</DialogDescription></DialogHeader>
      <div className={`relative rounded-lg border-2 border-dashed p-1 transition-colors ${dragOver ? "border-primary bg-primary/10" : "border-border"}`}
        onDragEnter={(event) => { event.preventDefault(); if (!busy) { dragDepth.current += 1; setDragOver(true); } }}
        onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = busy ? "none" : "copy"; }}
        onDragLeave={(event) => { event.preventDefault(); dragDepth.current -= 1; if (dragDepth.current <= 0) { dragDepth.current = 0; setDragOver(false); } }}
        onDrop={(event) => {
          event.preventDefault(); dragDepth.current = 0; setDragOver(false);
          if (busy) return;
          if (event.dataTransfer.files.length !== 1) { setError("Drop one image at a time."); return; }
          void choosePhoto(event.dataTransfer.files[0]);
        }}>
        <div className={`relative h-40 overflow-hidden rounded-md bg-muted sm:h-48 ${preview && !busy ? dragging ? "cursor-grabbing" : "cursor-grab" : ""}`}
          role="group" tabIndex={preview ? 0 : undefined} aria-label="Trip photo framing" aria-describedby={`framing-help-${trip.id}`}
          style={{ touchAction: preview ? "none" : "auto" }}
          onKeyDown={(event) => {
            if (busy || !preview) return;
            const step = event.shiftKey ? 10 : 2;
            if (event.key === "ArrowLeft") setX((value) => Math.min(100, value + step));
            else if (event.key === "ArrowRight") setX((value) => Math.max(0, value - step));
            else if (event.key === "ArrowUp") setY((value) => Math.min(100, value + step));
            else if (event.key === "ArrowDown") setY((value) => Math.max(0, value - step));
            else return;
            event.preventDefault();
          }}
          onPointerDown={(event) => {
            if (!preview || busy || event.button !== 0 || !dimensions.current.width || drag.current) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            const size = dimensions.current;
            const scale = Math.max(bounds.width / size.width, bounds.height / size.height) * zoom;
            drag.current = { pointer: event.pointerId, left: event.clientX, top: event.clientY, x, y, overflowX: size.width * scale - bounds.width, overflowY: size.height * scale - bounds.height };
            event.currentTarget.setPointerCapture(event.pointerId); setDragging(true);
          }}
          onPointerMove={(event) => {
            const start = drag.current;
            if (!start || start.pointer !== event.pointerId) return;
            if (start.overflowX > 0.5) setX(Math.max(0, Math.min(100, start.x - (event.clientX - start.left) / start.overflowX * 100)));
            if (start.overflowY > 0.5) setY(Math.max(0, Math.min(100, start.y - (event.clientY - start.top) / start.overflowY * 100)));
          }}
          onPointerUp={() => { drag.current = null; setDragging(false); }}
          onPointerCancel={() => { drag.current = null; setDragging(false); }}
          onLostPointerCapture={() => { drag.current = null; setDragging(false); }}>
          {preview ? <>
            <div className="pointer-events-none absolute inset-0" style={coverStyle(preview, x, y, zoom)} />
            {dragging ? <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <span key={i} className="border border-white/30" />)}</div> : null}
            <span className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-black/60 px-3 py-2 text-xs text-white"><Move className="size-3.5" />Drag photo to reposition</span>
          </> : <label htmlFor={`photo-${trip.id}`} className="flex h-full cursor-pointer flex-col items-center justify-center gap-3 px-4 text-center text-sm text-muted-foreground"><Upload className="size-7" /><span>Drop an image here or choose a photo</span></label>}
        </div>
        {dragOver ? <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-background/90 text-sm font-semibold text-primary">Drop to use this photo</div> : null}
      </div>
      <p id={`framing-help-${trip.id}`} className="text-xs text-muted-foreground">Drag with your mouse or finger to frame your photo. Use the arrow keys for precise adjustments, or zoom in to crop closer.</p>
      <div className="grid gap-2"><Label htmlFor={`photo-${trip.id}`}>Photo (up to 20 MB)</Label><Input id={`photo-${trip.id}`} type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy} onChange={async (event) => {
        const file = event.target.files?.[0]; if (!file) return;
        event.target.value = "";
        await choosePhoto(file);
      }} /></div>
      {[{ label: "Zoom", value: zoom, set: setZoom, min: 1, max: 3, step: 0.05 }].map((control) => <div key={control.label} className="grid gap-2">
        <Label htmlFor={`${trip.id}-${control.label}`}>{control.label}</Label>
        <input id={`${trip.id}-${control.label}`} type="range" className="min-h-11 w-full accent-primary" min={control.min} max={control.max} step={control.step} value={control.value} disabled={busy || !preview} onChange={(event) => control.set(Number(event.target.value))} />
      </div>)}
      <Button variant="secondary" disabled={busy || !preview} onClick={() => { setX(50); setY(50); setZoom(1); }}>Reset framing</Button>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap justify-between gap-3">
        {trip.coverVersion ? <Button variant="ghost" disabled={busy} onClick={() => void save(true)}>Remove photo</Button> : <span />}
        <Button disabled={busy || !preview} onClick={() => void save()}>{busy ? "Preparing photo…" : "Save photo"}</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
